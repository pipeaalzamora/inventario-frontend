import { signal, inject } from "@angular/core";
// import { StorageService } from "../services/storage";

type _record = Record<string, any>;
type localData = {
    id : number;
    data : _record;
    modelMap : Record<string, modelType>;
}

type mapData = {
    key: string;
    value: any;        
}

type _modelType = "string" | "number" | "boolean" | "date" | "array" | "object" | "null" | "undefined"
type modelType = {
    type: _modelType;
    len: number;
    minValue: any;
    maxValue: any;
}

export type PaginationControllerCFG = {
    keyId?: string;
    slicedMode?: boolean;
    sortColumn?: string;
    sortAscending?: boolean;    
    pageNumber?: number;
    pageSize?: number;
    pageSizeOptions?: number[];

    defaultFilterCommand?: FilterCommand;
    defaultSearchColumns?: string[];
}

type PrimiteveType = string | number | boolean | Date ;

type FilterOperatorBase = {
    $eq?: PrimiteveType
    $neq?: PrimiteveType;
    $gt?: PrimiteveType;
    $gte?: PrimiteveType;
    $lt?: PrimiteveType;
    $lte?: PrimiteveType;    
    $contains?: PrimiteveType;
    $ncontains?: PrimiteveType;

    //casos sensibles
    $seq?: PrimiteveType;
    $sneq?: PrimiteveType;
    $sgt?: PrimiteveType;
    $sgte?: PrimiteveType;
    $slt?: PrimiteveType;
    $slte?: PrimiteveType;   
    $scontains?: PrimiteveType;
    $sncontains?: PrimiteveType;

    //algo asi como funciones
    $null: boolean,
    $exists: boolean
}

type FilterOperator = {
    [K in keyof FilterOperatorBase]: { [P in K]: NonNullable<FilterOperatorBase[K]> }         
                                    & { [P in Exclude<keyof FilterOperatorBase, K>]?: never }
}[keyof FilterOperatorBase];

export type FilterCommand = {     
    [key: string]: FilterOperator;    
} | {
    $and?: FilterCommand[];
    $or?: FilterCommand[];
}

export type PageData<T> = {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    isSlicedMode: boolean;
    data: T[];
}

export type FilterData = {
    triggerBy: string;
    searchValue: string;
    filterCommand: FilterCommand;
    sortColumn: string;
    sortAscending: boolean;
}


export class PaginationController<T> {
    private keyId : string = "";

    private sliceMode : boolean = true;    
    private currentPage : number = 1;
    private pageSize : number = 30;
    private totalPages : number = 0;

    private searchValue : string = "";
    private searchFilterCommand : FilterCommand = {};
    private filterCommand : FilterCommand = {};

    //filterCommandSignal = signal<FilterCommand>({});
    //searchValueSignal = signal<string>("");

    private defaultSearchColumns : string[] = [];

    public sortColumn : string = "";
    private sortAscending : boolean = true;
    
    private rawData : T[] = [];
    private localData : localData[] = [];

    private pageSizeOptions : number[] = [15, 30, 50, 100];

    private filterDataSignal = signal<FilterData>({
        triggerBy: "controller",
        searchValue: this.searchValue,
        filterCommand: this.filterCommand,
        sortColumn: this.sortColumn,
        sortAscending: this.sortAscending
    })

    private currentDataSignal = signal<PageData<T>>({ 
        currentPage: this.currentPage, 
        pageSize: this.pageSize, 
        totalItems: 0,
        isSlicedMode: this.sliceMode,
        data: [] 
    });   

    public FilterData = this.filterDataSignal.asReadonly();
    
    public GetData = this.currentDataSignal.asReadonly();

    constructor(
        data?: T[],
        private cfg? : PaginationControllerCFG
    ){  
        this.currentPage = 1;
        this.pageSize = 15;
        this.sortColumn = "";
        this.sliceMode = true;
        this.sortAscending = true;
       
        if( typeof cfg != "undefined" ){
            if( 
                typeof cfg.keyId != "undefined" 
                && cfg.keyId != null 
                && ( cfg.keyId = cfg.keyId.trim() ) != "" 
            ){
                this.keyId = cfg.keyId;
            }
            
            if( 
                typeof cfg.pageNumber != "undefined" 
                && cfg.pageNumber != null
                && cfg.pageNumber > 0
            ){
                this.currentPage = cfg.pageNumber;
            }
            
            if( 
                typeof cfg.pageSize != "undefined" 
                && cfg.pageSize != null
                && cfg.pageSize > 0
            ){
                this.pageSize = cfg.pageSize;
            }
           
            if( 
                typeof cfg.sortColumn != "undefined"
                && cfg.sortColumn != null
                && ( cfg.sortColumn = cfg.sortColumn.trim() ) != ""
            ){
                this.sortColumn = cfg.sortColumn;
            }
            
            if( 
                typeof cfg.slicedMode != "undefined" 
                && cfg.slicedMode != null
                && ( cfg.slicedMode = Boolean( cfg.slicedMode ) ) != null
            ){
                this.sliceMode = cfg.slicedMode;
            } 
           
            if(
                typeof cfg.sortAscending != "undefined" 
                && cfg.sortAscending != null
                && ( cfg.sortAscending = Boolean( cfg.sortAscending ) ) != null
            ){
                this.sortAscending = cfg.sortAscending;
            }
            
            if( 
                typeof cfg.defaultFilterCommand != "undefined" 
                && cfg.defaultFilterCommand != null
                && typeof cfg.defaultFilterCommand === "object"
            ){
                this.filterCommand = structuredClone( cfg.defaultFilterCommand );
            }

            if( 
                typeof cfg.defaultSearchColumns != "undefined" 
                && cfg.defaultSearchColumns != null
                && Array.isArray( cfg.defaultSearchColumns )
            ){
                this.defaultSearchColumns = structuredClone( cfg.defaultSearchColumns );
                this.SetSearchColumns( this.defaultSearchColumns );
            }
            
            if( 
                typeof cfg.pageSizeOptions != "undefined" 
                && cfg.pageSizeOptions != null
                && Array.isArray( cfg.pageSizeOptions )
            ){
                this.pageSizeOptions = structuredClone( cfg.pageSizeOptions );
            }
        }

        if (data) this.#setRawData(data);
    }

    public SetRawData( data: T[] ) : void {
        this.#setRawData( data, "controller" );
    }

    public Sort( column: string, ascending: boolean = true ) : void {
        this.sortColumn = column;
        this.sortAscending = ascending;
        this.currentPage = 1;
        this.#make();
    }
    
    
    public Filter( filterCommand: FilterCommand ) : void {
        this.filterCommand = structuredClone( filterCommand );
        this.#make();
    }

    public SetPageSize( size: number ) : void {
        this.SetPage( 1, size );
    }

    public SetPage( page: number, size: number ) : void {
        if( page < 1 ) page = 1;
        if( page > this.totalPages ) page = this.totalPages;
        
        this.currentPage = page;

        if ( size != this.pageSize ) {
            if( size < 1 ) size = 1;
            if( size > 200 ) size = 200;
            
            this.pageSize = size;        
            this.totalPages = Math.ceil( this.rawData.length / this.pageSize );
            this.currentPage = 1;        
        }

        this.#make();
    }

    public SetSliceMode( mode: boolean ) : void {
        this.sliceMode = mode;        
        this.#make();
    }

    public SetSearchColumns( columns: string[] ) : void {        
        this.defaultSearchColumns = structuredClone( columns );

        let _searchFilterCommand : FilterCommand = {
            $or: []            
        };
        
        for( let c of columns ){
            _searchFilterCommand.$or!.push( { [c]: { $contains:  String( this.searchValue ).trim() } } );          
        }

        this.searchFilterCommand = structuredClone( _searchFilterCommand );
    }
   
    public Search( src: string, triggerBy: string = "controller" ) : void {
        this.currentPage = 1;
        this.#setSearchValue( src );
        this.#make();
    }
    
    public CleanFilters() {
        this.#setSearchValue( "" );
        this.filterCommand = {};
        this.#make();
    }
    
    public GetPageSizeOptions() : number[] {
        return this.pageSizeOptions;
    }

    #setRawData( data?: T[], triggerBy: string = 'controller' ) : void {
        if (typeof data != 'undefined') {
            this.totalPages = Math.ceil( data.length / this.pageSize );
            
            this.rawData = structuredClone( data );
            this.localData = this.#createAllLocalData( data );
        }

        this.#SetStorageKey(triggerBy);

        this.currentPage = 1;

        this.#make();
    }

    #hasConfig(): string | null {
        if (this.keyId != '' && localStorage.getItem(this.keyId)) {
            const config = localStorage.getItem(this.keyId);
            return config;
        }
        return null;
    }

    #SetStorageKey(triggerBy: string) : void {
        if (this.keyId != ''){
            const configStr = this.#hasConfig();
            if (configStr) {
                const config = JSON.parse(configStr);
                this.currentPage = config['currentPage'];
                this.pageSize = config['pageSize'];
                this.sortColumn = config['sortColumn'];
                this.sortAscending = config['sortAscending'];
                this.sliceMode = config['sliceMode'];
                this.filterCommand = structuredClone(config['filterCommand']);
                this.searchFilterCommand = structuredClone(config['searchFilterCommand']);
                this.searchValue = config['searchValue'];
            }
        }
        
        this.filterDataSignal.set({
            triggerBy: triggerBy,
            searchValue: this.searchValue,
            filterCommand: this.filterCommand,
            sortColumn: this.sortColumn,
            sortAscending: this.sortAscending
        })
    }

    #setSearchValue( value: string ) : void {
        this.searchValue = cleanSearchString( value.toLowerCase() );
        
        for(let prop of this.searchFilterCommand.$or as FilterOperator[] ){
            for( let key in prop ){
                (prop as any)[key].$contains = this.searchValue;
            }
        }
    }

    #saveConfig() {
        if (this.keyId != '') {
            const config = {
                'currentPage': this.currentPage,
                'pageSize': this.pageSize,
                'sortColumn': this.sortColumn,
                'sortAscending': this.sortAscending,
                'sliceMode': this.sliceMode,
                'filterCommand': this.filterCommand,
                'searchFilterCommand': this.searchFilterCommand,
                'searchValue': this.searchValue,
            }
            localStorage.setItem(this.keyId, JSON.stringify(config));
        }
    }

    #make() : void{

        if (this.keyId != '') {
            this.#saveConfig();
        }

        let currentPage = this.currentPage;
        let pageSize = this.pageSize;

        const start = pageSize * (currentPage - 1);

        //filtramos la data local con los filtros seleccionados                
        let _data =  this.localData.filter( this.#filter( this.filterCommand) );       

        if( this.searchValue != "" ){
            _data = _data.filter( this.#filter( this.searchFilterCommand ) );
        }

        //ordenamos la data local
        _data.sort( this.#sort( this.sortColumn, this.sortAscending ) );

        let sliced : localData[] = [];
        if( this.sliceMode ){
            const end = pageSize * currentPage;
            sliced = _data.slice( start, end );
            
        }else{
            sliced = _data;
            currentPage = 1;
            pageSize = _data.length;
            this.pageSizeOptions = [ _data.length ];
        }        

        const indexs = sliced.map( (item) => item.id );

        let _currentData : T[] = new Array<T>( indexs.length );

        for( let i = 0; i < indexs.length; i++ ){
            const find = this.rawData.find( (_, index) => index === indexs[i] );
            if ( find != null ){
                _currentData[i] = structuredClone( find );
            }             
        }

        this.currentDataSignal.set({
            currentPage: currentPage,
            pageSize: pageSize,
            totalItems: _data.length,
            isSlicedMode: this.sliceMode,
            data: _currentData
        });
    } 

    #createAllLocalData( data: T[] ) : localData[] {
        let _localData : localData[] = new Array<localData>( data.length );

        for( let i = 0; i < data.length; i++ ){        
            let _data : localData = {
                id: i,
                data: {},
                modelMap: {},
            }
            
            if ( this.sortColumn == "") {
                const keys = Object.keys( data[i] as any );

                if ( typeof keys[0] != "undefined" ){
                    this.sortColumn = String(keys[0]);
                }
            }
            const mappingData = this.#createMappingRecursive( 
                "", 
                data[i], 
                _data
            );         

            for( let i = 0; i < mappingData.length; i++ ){                
                _data.data[mappingData[i].key] = mappingData[i].value;
            }  

            _localData[i] = _data;
        }

        return _localData;
    }

    #createMappingRecursive( parentkey : string , data: any, _localData : localData ) : mapData[] {         
        let _maps : mapData[] = [];

        for( let prop in data ){
            let _key = parentkey.trim();
            if ( _key != "" ){
                _key = _key + "." + prop;                
            }else{
                _key = prop;
            }            

            if( typeof data[prop] === "function" ) continue;

            if( !Number.isInteger( parseInt(prop) ) ){
                let mapKey = _key.replace(/\d+/g, "$");
                
                let typ : _modelType = typeof data[prop] as _modelType;
                let len = 1;
                let min = null;
                let max = null;

                if( Array.isArray( data[prop] ) ){
                    let newLen = data[prop].length;
                    let oldLen = _localData.modelMap[mapKey]?.len ?? 0
                    mapKey = mapKey + ".$";
                    typ = "array";
                    len = ( newLen > oldLen ) ? newLen : oldLen;
                }
                

                if( data[prop] instanceof Date ){
                    typ = "date";
                    min = data[prop];
                    max = data[prop];
                }
                
                if( typeof data[prop] !== "object" ){
                    if( typeof data[prop] === "string" ){                        
                        if( mayISO8601(data[prop]) && !isNaN( Date.parse( data[prop] ) ) ){
                            typ = "date";
                            data[prop] = new Date(data[prop]);
                        }                                       
                    }

                    min = data[prop];
                    max = data[prop];
                }

                if( typeof _localData.modelMap[mapKey] === "undefined" ){
                    _localData.modelMap[mapKey] = {
                        type: typ,
                        len: len,
                        minValue: min,
                        maxValue: max,
                    };
                }else{
                    switch( typ ){
                        case "string":  
                            if ( data[prop] == null ){
                                _localData.modelMap[mapKey].minValue = null;    
                            }else{
                                let _v = data[prop]
                                if ( _v >= _localData.modelMap[mapKey].maxValue ){
                                    _localData.modelMap[mapKey].maxValue =_v;
                                }else if ( _v <= _localData.modelMap[mapKey].minValue ){
                                    _localData.modelMap[mapKey].minValue =_v;
                                }    
                            }
                            
                            if( mayISO8601(data[prop]) && !isNaN( Date.parse( data[prop] ) ) ){
                                _maps.push( { key: _key, value: new Date(data[prop]) } );
                                continue;
                            }
                            break;              
                        case "number":
                            if ( data[prop] == null )
                                _localData.modelMap[mapKey].minValue = null;    
                            else if ( data[prop] >= _localData.modelMap[mapKey].maxValue ){
                                _localData.modelMap[mapKey].maxValue = data[prop];
                            }else if ( data[prop] <= _localData.modelMap[mapKey].minValue ){
                                _localData.modelMap[mapKey].minValue = data[prop];
                            }
                            break;
                        case "boolean":
                            if( data[prop] == null )
                                _localData.modelMap[mapKey].minValue = null;
                            else if ( Number( data[prop] ) - Number( _localData.modelMap[mapKey].minValue ) <= 0 ){
                                _localData.modelMap[mapKey].minValue = false;
                            }else if ( Number( data[prop] ) - Number( _localData.modelMap[mapKey].maxValue ) >= 0 ){
                                _localData.modelMap[mapKey].maxValue = true;
                            }
                            break;
                        case "date":
                            if( data[prop] == null )
                                _localData.modelMap[mapKey].minValue = null;
                            else if ( data[prop].getTime() >= _localData.modelMap[mapKey].maxValue.getTime() ){
                                _localData.modelMap[mapKey].maxValue = data[prop];
                            }else if ( data[prop].getTime() <= _localData.modelMap[mapKey].minValue.getTime() ){
                                _localData.modelMap[mapKey].minValue = data[prop];
                            }
                            break;
                    }  
                }                
            }

            if( data[prop] === null ){
                _maps.push( { key: _key, value: null } );                
                continue;
            }

            if (data[prop] instanceof Date) {
                _maps.push( { key: _key, value: data[prop] } );
                continue;
            }
            
            if( typeof data[prop] === "string" ){
                if( mayISO8601(data[prop]) && !isNaN( Date.parse( data[prop] ) ) ){
                    _maps.push( { key: _key, value: new Date(data[prop]) } );
                    continue;
                }

                _maps.push( { key: _key, value: data[prop] });
                continue;
            }

            if( typeof  data[prop] === "number" || typeof  data[prop] === "boolean" ){                
                _maps.push( { key: _key, value:  data[prop] } )        
                continue;
            }   

            if( typeof data[prop] === "object" ){  
                const _recursiveMaps = this.#createMappingRecursive( _key, data[prop], _localData );                
                _maps = _maps.concat( _recursiveMaps );
                continue;
            } 
        }

        return _maps
    }

    #filter( filterCommand : FilterCommand) : (el : localData) => boolean  | undefined {
        this.currentPage = 1;
        const evaluate = (operator: FilterOperator, value: PrimiteveType, allValues : boolean[]) => {                
            const comparetenator = new Comparator( operator );                  
            allValues.push( comparetenator.evaluate( value ) );
        }

        return (el : localData) => {
            if (Object.keys(filterCommand).length === 0) return  true;

            const andValues : boolean[] = [];

            for( let prop in filterCommand ){
                const theFilter = (filterCommand as any )[prop] as FilterOperator;
                switch( prop ){
                    case "$and":
                        let _andValues : boolean[] = [];
                        for( let i = 0; i < (filterCommand as any)[prop].length; i++ ){
                            const _filter = this.#filter( (filterCommand as any)[prop][i] );
                            if( typeof _filter === "undefined" ) continue;
                            
                            const r = _filter( el )
                            _andValues.push( r ? r : false );
                        }
                        andValues.push( _andValues.every( (value) => value === true ) );
                    break;
                    case "$or":                        
                        let _orValues : boolean[] = [];
                        for( let i = 0; i < (filterCommand as any)[prop].length; i++ ){
                            const _filter = this.#filter( (filterCommand as any)[prop][i] );
                            if( typeof _filter === "undefined" ) continue;
                            
                            const r = _filter( el )
                            _orValues.push( r ? r : false );
                        }
                        andValues.push( _orValues.some( (value) => value === true ) );
                    break;
                    default:                               
                        if( typeof el.modelMap[prop] === "undefined" ){
                            //si la propiedad no existe en el mapa del modelo, es probable que una de esas propiedades sea un array
                            //por lo que descomponemos el nombre de la columna en partes
                            const columnParts = prop.split(".");

                            //iteramos para saber cuantos de ellos son un array y arrastramos el nombre de la propiedad
                            let elasticColumn = "";
                            for(let i = 0; i < columnParts.length; i++){      
                                if (elasticColumn == "")
                                    elasticColumn = columnParts[i];            
                                else 
                                    elasticColumn += "." + columnParts[i];   
                                
                                    const tryColumn = elasticColumn + ".$";

                                if( typeof el.modelMap[tryColumn] != "undefined" && el.modelMap[tryColumn].type === "array" ){                                                               
                                    elasticColumn = tryColumn;
                                }
                            }                            
                            
                            //revisamos si la propiedad existe en el mapa del modelo              
                            if( typeof el.modelMap[elasticColumn] != "undefined" ){                                     
                                prop = elasticColumn;
                            }                           
                        }
                       
                        //si la propiedad tiene alguna forma de array, la descomponemos
                        if( prop.includes("$") ){      
                            const columnParts = prop.split(".$");
                            
                            let lens : number[] = [];
                            let elasticColumn = "";
                            for( let i = 0; i < columnParts.length; i++ ){
                                let p = columnParts[i].trim();    
                                //si el ultimo es vacio el anterior era un array                            
                                if( typeof columnParts[i+1] != "undefined" && columnParts[i+1].trim() != "" ){
                                    p = p + ".$";
                                }
                                //if ( p == "") break;

                                elasticColumn += p;
                                
                                if( typeof el.modelMap[elasticColumn] != "undefined" && el.modelMap[elasticColumn].type === "array" ){
                                    lens.push( el.modelMap[elasticColumn].len );
                                }
                            }
                            
                            //creamos un mapa de indices para tener todas las combinaciones posibles de indices
                            //VERGUENZIA DEL CHINITO aca hay magia de IA
                            const indexArrays = lens.map(length => Array.from({ length }, (_, i) => i) );
                            const allIndexCombinations = indexArrays.reduce(
                                (acc : number[][], currentArray) => 
                                  acc.flatMap((prevCombination) => 
                                    currentArray.map((value) => [...prevCombination, value])
                                  ),
                                [[]]
                            ).filter(arr => arr.length > 0);

                            const combinations = allIndexCombinations.map((indices) => {
                                let currentIndex = 0;
                                return elasticColumn.replace(/\$/g, () => indices[currentIndex++].toString());
                            });
                            /////////////////////////
                            
                            let orValues : boolean[] = [];
                            for (const combination of combinations) {
                                evaluate(
                                    theFilter,
                                    el.data[combination],
                                    orValues
                                );
                            }
                            const operator = Object.keys( theFilter as object )[0] as keyof FilterOperatorBase;
                            switch( operator ) {
                                //case "$contains":
                                case "$ncontains":
                                    andValues.push( orValues.every( (value) => value === true ) );
                                break;
                                case "$eq":
                                case "$neq":
                                    andValues.push( orValues.every( (value) => value === true ) );
                                break;
                                default:
                                    andValues.push( orValues.some( (value) => value === true ) );
                                break;
                            }

                            //filtrar por propiedades de un array son un or
                            // andValues.push( orValues.some( (value) => value === true ) );                            
                        }else{
                            evaluate( theFilter, el.data[prop], andValues );
                        }                      
                    break;
                }
            }
            if (andValues.length == 0 ) return false;

            return andValues.every( (value) => value === true );
        }
    }    

    #sort( column: string, ascending: boolean ) : (a: localData, b: localData) => number {
        return (a: localData, b: localData) => {
            //si la columna es null, undefined o vacia, no se puede ordenar
            if( column === null || column === undefined || String( column ).trim() === "" ){
                return 0;
            }  
            
            //vemos si la propiedad existe en el mapa del modelo
            if( typeof a.modelMap[column] != "undefined" || typeof a.data[column] != "undefined" ){              
                
                const _column = column.replace(/\d+/g, "$");

                //obtenemos el tipo de dato
                const typeA = a.modelMap[_column]?.type ?? 'undefined';
                const typeB = b.modelMap[_column]?.type ?? 'undefined';

                //si el tipo de dato de es null o undefined de cualquiera, siempre es el mayor                
                if (typeA === "null" || typeA === "undefined" || typeB === "null" || typeB === "undefined") {                    
                    return 1;
                }                      
                        

                //si lo tipos son distintos no se puede comparar
                if( typeA !== typeB ){                    
                    return 0;
                }   

                //si el tipo de dato es un object no se puede comparar
                if( typeA === "object" || typeB === "object" ){                    
                    return 0;
                }

                //si el tipo de dato es un array comparamos el tamaño del array
                if( typeA === "array" && typeB === "array" ){
                     
                    const lenA = a.modelMap[column].len;
                    const lenB = b.modelMap[column].len;
                    
                    if ( ascending ) return lenA - lenB;
                    else return lenB - lenA;
                }

                //obtenemos si la columna consultada contiene algun array
                const existArrayColumn = column.includes("$");

                let valueA : any;
                let valueB : any;

                //si en la columna existe algun array, entonces usaremos los minimos y maximos   
                if( existArrayColumn ){                    
                    //al igual que en mongo, si es ascendente usaremos el minimo para comparar
                    if( ascending ){
                        valueA = a.modelMap[column].minValue;
                        valueB = b.modelMap[column].minValue;
                    }else{
                        valueA = a.modelMap[column].maxValue;
                        valueB = b.modelMap[column].maxValue;
                    }
                }else{
                    valueA = a.data[column];
                    valueB = b.data[column];
                }

                //si el valor de a o b es null o undefined siempre es mayor
                if( 
                    valueA === null || valueA === undefined 
                    || valueB === null || valueB === undefined
                ){                    
                    return 1;
                }
                

                //si el tipo de dato es un string comparamos el valor
                if( typeA === "string" ){ 
                    if ( valueA == valueB ) return 0;
                    if (ascending) return valueA.toLowerCase() < valueB.toLowerCase() ? -1 : 1;
                    else return valueA.toLowerCase() > valueB.toLowerCase() ? -1 : 1;
                }

                //si el tipo de dato es un number comparamos el valor
                if( typeA === "number" ){                    
                    if (ascending) 
                        return Number(valueA) - Number(valueB);
                    else
                        return Number(valueB) - Number(valueA);      
                    
                }

                //si el tipo de dato es un boolean comparamos el valor
                if( typeA === "boolean" ){
                    if ( ascending ) return Number(valueA) - Number(valueB);
                    else return Number(valueB) - Number(valueA);
                }

                //si el tipo de dato es un date comparamos el valor
                if( typeA === "date" ){
                    if( ascending ) return valueA.getTime() - valueB.getTime();
                    else return valueB.getTime() - valueA.getTime();
                }
                
            }else{  
                
                //si la propiedad no existe en el mapa del modelo, es probable que una de esas propiedades sea un array
                //por lo que descomponemos el nombre de la columna en partes
                const columnParts = column.split(".");

                //iteramos para saber cuantos de ellos son un array y arrastramos el nombre de la propiedad                c
                let elasticColumn = "";
                for(let i = 0; i < columnParts.length; i++){                         
                    if (elasticColumn == "")
                        elasticColumn = columnParts[i];            
                    else 
                        elasticColumn += "." + columnParts[i];

                    const tryColumn = elasticColumn + ".$"; 

                    if( typeof a.modelMap[tryColumn] != "undefined" && a.modelMap[tryColumn].type === "array" ){                                                               
                        elasticColumn = tryColumn;
                    }
                }
                
               
                //revisamos si la propiedad existe en el mapa del modelo              
                if( typeof a.modelMap[elasticColumn] != "undefined" ){                    
                    //si existe, entonces llamamos a la funcion de ordenamiento                    
                    return this.#sort( elasticColumn, ascending )( a, b );
                }
            }
            
            return 0
        }
        
    }

         

    #applyValueOnSearchFilter( value: string ) : void {
        for(let prop in this.searchFilterCommand ){

            //(this.searchFilterCommand as any)[prop].$contains = value;
        }
    }
}


class Comparator { 
    constructor( private operator : FilterOperator ){}

    public evaluate( value: PrimiteveType ) : boolean {
        if( !this.operator ) return false;

        const operator = Object.keys( this.operator as object )[0] as keyof FilterOperatorBase;
        const valueOperator = this.operator[operator] as PrimiteveType;
        switch( operator ){
            case "$eq":
                return this.#equalFilter( value, valueOperator, false );
            case "$neq":
                return !this.#equalFilter( value, valueOperator, false );
            case "$gt":
                return this.#greaterThanFilter( value, valueOperator, false );
            case "$gte":
                return this.#greaterThanOrEqualFilter( value, valueOperator, false );
            case "$lt":
                return this.#lessThanFilter( value, valueOperator, false );
            case "$lte":
                return this.#lessThanOrEqualFilter( value, valueOperator, false );
            case "$contains":
                return this.#containsFilter( value, valueOperator, false );
            case "$ncontains":
                return !this.#containsFilter( value, valueOperator, false );

            case "$seq":
                return this.#equalFilter( value, valueOperator, true );
            case "$sneq":
                return !this.#equalFilter( value, valueOperator, true );
            case "$sgt":
                return this.#greaterThanFilter( value, valueOperator, true );
            case "$sgte":
                return this.#greaterThanOrEqualFilter( value, valueOperator, true );
            case "$slt":
                return this.#lessThanFilter( value, valueOperator, true );
            case "$slte":
                return this.#lessThanOrEqualFilter( value, valueOperator, true );
            case "$scontains":
                return this.#containsFilter( value, valueOperator, true );
            case "$sncontains":
                return !this.#containsFilter( value, valueOperator, true ); 
                
            case "$null":
                return this.#isNull( value, valueOperator as boolean );
            case "$exists":
                return this.#exists( value, valueOperator as boolean );
            default:
                throw new Error(`El operador ${operator} no es valido`);
        }
    }

    //ESTRATEGIAS PARA FILTRADO
    #equalFilter( a: PrimiteveType, b: PrimiteveType, sensity: boolean ) : boolean {
        if( typeof a === "string" && typeof b === "string" ){
            if( !sensity ){
                return a.toLowerCase() === b.toLowerCase();
            }else{                
                return a === b;
            }
        }

        if( typeof a === "number" && typeof b === "number" ){
            return Number( a ) === Number( b );
        }

        if( typeof a === "boolean" && typeof b === "boolean" ){
            return Boolean( a ) === Boolean( b );
        }

        if( typeof a === "object" && typeof b === "object" ){
            if( a instanceof Date && b instanceof Date ){
                //dificil que sean exactamente iguales, hay que comparar el año, mes y dia
                return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();                
            }else if( Array.isArray( a ) && Array.isArray( b ) ){
                return a.length === b.length;
            }
            
            return JSON.stringify( a ) === JSON.stringify( b );
        }

        if( a === null && b === null ){
            return true;
        }
        if( a === undefined && b === undefined ){
            return true;
        }

        return false;
    }

    #greaterThanFilter( a: PrimiteveType, b: PrimiteveType, sensity: boolean ) : boolean {
        if( typeof a === "string" && typeof b === "string" ){
            if( !sensity ){
                return a.toLowerCase() > b.toLowerCase();
            }else{
                return a > b;
            }
        }

        if( typeof a === "number" && typeof b === "number" ){
            return Number( a ) > Number( b );
        }

        if( typeof a === "boolean" && typeof b === "boolean" ){
            return Number( a ) > Number( b );
        }

        if( typeof a === "object" && typeof b === "object" ){
            if( a instanceof Date && b instanceof Date ){
                return a.getTime() > b.getTime();                
            }else if( Array.isArray( a ) && Array.isArray( b ) ){
                return a.length > b.length;
            }
            
            return JSON.stringify( a ) > JSON.stringify( b );
        }        

        return false;
    }

    #lessThanFilter( a: PrimiteveType, b: PrimiteveType, sensity: boolean ) : boolean {
        if( typeof a === "string" && typeof b === "string" ){
            if( !sensity ){
                return a.toLowerCase() < b.toLowerCase();
            }else{
                return a < b;
            }
        }
        if( typeof a === "number" && typeof b === "number" ){
            return Number( a ) < Number( b );
        }
        if( typeof a === "boolean" && typeof b === "boolean" ){
            return Number( a ) < Number( b );
        }
        if( typeof a === "object" && typeof b === "object" ){
            if( a instanceof Date && b instanceof Date ){
                return a.getTime() < b.getTime();                
            }else if( Array.isArray( a ) && Array.isArray( b ) ){
                return a.length < b.length;
            }
            
            return JSON.stringify( a ) < JSON.stringify( b );
        }

        return false;
    }

    #greaterThanOrEqualFilter( a: PrimiteveType, b: PrimiteveType, sensity: boolean ) : boolean {   
        return this.#greaterThanFilter( a, b, sensity ) || this.#equalFilter( a, b, sensity );        
    }

    #lessThanOrEqualFilter( a: PrimiteveType, b: PrimiteveType, sensity: boolean ) : boolean {
        return this.#lessThanFilter( a, b, sensity ) || this.#equalFilter( a, b, sensity );
    }

    #containsFilter( a: PrimiteveType, b: PrimiteveType, sensity: boolean ) : boolean {      
        /*
        contains es un metodo especial, ya que funciona siempre transformando todo a strings
        pero puede determinar si son fechas y hace comparacion equal que considera mes dia o año
        */
        switch( typeof a ){
            case "string":
            case "number":
            case "boolean":
                if( !sensity ){
                    return cleanSearchString( String( a ) ).includes(cleanSearchString(String( b )));
                }else{
                    return String( a ).includes( String( b ) );
                }
                break;
            case "object":
                //b podria ser un string y no precisamente un objeto Date, por lo que hay que validar y transformarlo                
                if( typeof b != "object" ){
                    
                    let kind : "false" | "dumb" | "normal" = "false";
                    if( (kind = maySimpleDate( String(b) )) != "false" ){
                        
                        if( kind === "dumb" && !isNaN( Date.parse( String(b) ) ) ){
                            b = new Date( String(b) );
                        }

                        if( kind === "normal" ){
                           //convertir el formato de fechha  DD-MM-YYYY o DD/MM/YYYY a YYYY-MM-DD
                            const parts = String(b).split(/[-\/]/);
                            const year = parts[2];
                            const month = parts[1].padStart(2, '0');
                            const day = parts[0].padStart(2, '0');
                            
                            b = new Date(`${year}/${month}/${day}`);
                        }   
                    } else {
                        return this.#containsFilter( String(a), String(b), sensity );
                    }
                }

                if( a instanceof Date && b instanceof Date ){
                    return this.#equalFilter( a, b, sensity );
                }

                return JSON.stringify( a ) === JSON.stringify( b );               
            default:
                return false
        }
    }

    #isNull( a: PrimiteveType, direction: boolean ) : boolean {  
        if( direction ) return a === null
        return a !== null;
    }

    #exists( a: PrimiteveType, direction: boolean ) : boolean {
        if(direction) return a !== undefined;
        
        return a === undefined;
    }
}

const ISOREGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/;
function mayISO8601(str : string) : boolean {
    return ISOREGEX.test(str);
}; 

//const regex = /^(?:(\d{4})([-/])(0[1-9]|1[0-2])\2(0[1-9]|[12][0-9]|3[01])|(0[1-9]|[12][0-9]|3[01])([-/])(0[1-9]|1[0-2])\5(\d{4}))$/;
//const DATEREGEX = /^(?:\d{4}[-\/](0[1-9]|1[0-2])[-\/](0[1-9]|[12]\d|3[01])|(0[1-9]|[12]\d|3[01])[-\/](0[1-9]|1[0-2])[-\/]\d{4})$/;
const DATEREGEX = /^(?:\d{4}([\/-])(0[1-9]|1[0-2])\1(0[1-9]|[12]\d|3[01])|(0[1-9]|[12]\d|3[01])([\/-])(0[1-9]|1[0-2])\5\d{4})$/;

function maySimpleDate(texto : string) : "false" | "dumb" | "normal" {
    // Validación rápida de formato con regex precompilado
    if (!DATEREGEX.test(texto)) return "false";
    
    // Extracción numérica directa sin grupos de captura
    const partes = texto.split(/[-\/]/);
    let año, mes, día;
    
    let kind : "false" | "dumb" | "normal" = "dumb" 
    if (partes[0].length === 4) {
        [año, mes, día] = partes.map(Number);
    } else {
        kind = "normal";
        [día, mes, año] = partes.map(Number);
    }

    // Validación matemática sin crear objetos Date
    if (mes < 1 || mes > 12) return "false";
    
    const diasPorMes = [
        31, // Enero
        (año % 4 === 0 && año % 100 !== 0) || año % 400 === 0 ? 29 : 28, // Febrero
        31, 30, 31, 30, 31, 31, 30, 31, 30, 31
    ];
    
    return día > 0 && día <= diasPorMes[mes - 1] ? kind : "false";
}

function cleanSearchString(value: string): string {
    const stringCleaned = value.trim()
        .normalize('NFD')   
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    return stringCleaned;
}