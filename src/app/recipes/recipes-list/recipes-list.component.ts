import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PaginationController, PaginationControllerCFG } from '@/shared/paginationController';
import { ColumnDefinition, FilterComponent } from '@/shared/components/controller/filter/filter.component';
import { SearchBarComponent } from '@/shared/components/controller/search-bar/search-bar.component';
import { SorterHeaderComponent } from '@/shared/components/controller/sorter-header/sorter-header.component';
import { PaginationComponent } from '@/shared/components/controller/pagination/pagination.component';
import { TableCaptionComponent } from '@/shared/components/controller/table-caption/table-caption.component';

import { ClpCurrencyPipe } from '@/shared/pipes/clp-currency.pipe';
import { DecimalPipe } from '@angular/common';
import { NoImageComponent } from 'public/default/no-image.component';

type Recipe = {
  sku: string;
  nombre: string;
  costoTotal: number;
  proteccion10: number | null;
  iva: number;
  costoFinal: number;
  porcentajeCosto: number;
  precioVenta: number;
  tiendas: string[];
};

const controllerComponents = [
  FilterComponent,
  SearchBarComponent,
  SorterHeaderComponent,
  PaginationComponent,
  TableCaptionComponent,
];

const tiendas = [
  'AGUSTINAS',
  'AHUMADA',
  'EL LLANO',
  'ISIDORA',
  'MALL FLORIDA CENTER',
  'MALL ALTO LAS CONDES',
  'MALL PLAZA VESPUCIO',
  'MALL PARQUE ARAUCO',
  'FLORIDA CENTER 2',
  'MALL EL TREBOL',
  'MALL PLAZA OESTE',
  'MALL PASEO COSTANERA',
];

const generateMockRecipes = (): Recipe[] => {
  const nombres = [
    'Ensalada César',
    'Pasta Carbonara',
    'Burger Premium',
    'Salmón a la Mantequilla',
    'Tacos al Pastor',
    'Risotto de Champiñones',
    'Pechuga Teriyaki',
    'Ceviche Clásico',
    'Lasaña Bolognesa',
    'Filete Mignon',
    'Camarones al Ajillo',
    'Quesadillas de Queso',
    'Pozole Verde',
    'Chiles Rellenos',
    'Costillas BBQ',
    'Pad Thai',
    'Mofongo',
    'Ratatouille',
    'Carne Asada',
    'Paella Marinera',
    'Enchiladas Verdes',
    'Fish and Chips',
    'Milanesa Napolitana',
  ];

  const ingredientes = [
    'Papas cortadas',
    'Ajo picado',
    'Tomate molido',
    'Cebolla picada',
    'Salsa BBQ',
    'Salsa de soja',
    'Mayonesa',
    'Queso rallado',
    'Pimienta negra',
    'Sal de mar',
    'Aceite de oliva',
    'Vinagre balsámico',
    'Limón fresco',
    'Cilantro picado',
    'Jalapeño picado',
    'Huevo cocido',
    'Tocino crujiente',
    'Champiñones laminados',
    'Caldo de pollo',
    'Leche condensada',
  ];

  const allItems: Array<{ name: string; isIngrediente: boolean }> = [
    ...nombres.map(name => ({ name, isIngrediente: false })),
    ...ingredientes.map(name => ({ name, isIngrediente: true })),
  ];

  allItems.sort(() => Math.random() - 0.5);

  return allItems.map((item, index) => {
    const costoTotal = Math.random() * 50000 + 10000;
    const tieneProteccion = !item.isIngrediente && index % 3 !== 0;
    const proteccion10 = tieneProteccion ? (costoTotal * 0.1) : null;
    const iva = tieneProteccion ? ((costoTotal + (proteccion10 || 0)) * 0.19) : 0;
    const costoFinal = tieneProteccion ? (costoTotal + (proteccion10 || 0) + iva) : 0;
    const porcentajeCosto = tieneProteccion ? (Math.random() * 40 + 20) : 0;
    const precioVenta = tieneProteccion ? (costoFinal / (1 - porcentajeCosto / 100)) : 0;

    return {
      sku: `REC-${String(index + 1).padStart(4, '0')}`,
      nombre: item.name,
      costoTotal,
      proteccion10,
      iva,
      costoFinal,
      porcentajeCosto,
      precioVenta,
      tiendas: tieneProteccion ? tiendas.slice(0, Math.floor(Math.random() * tiendas.length) + 1) : [],
    };
  });
};

@Component({
  selector: 'dot-recipes-list',
  imports: [
    controllerComponents,
    NoImageComponent,
    ClpCurrencyPipe,
    DecimalPipe,
  ],
  templateUrl: './recipes-list.component.html',
  styleUrl: './recipes-list.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipesListComponent {
  protected recipesData = signal<Recipe[]>(generateMockRecipes());

  protected recipesController = new PaginationController<Recipe>([], <PaginationControllerCFG>{
    defaultSearchColumns: ['nombre', 'sku'],
    sortColumn: 'nombre',
    pageSize: 20,
  });

  protected recipesColumns: ColumnDefinition[] = [
    { columnName: 'sku', nameToShow: 'SKU', type: 'string' },
    { columnName: null, nameToShow: 'Imagen', type: 'string', noSort: true },
    { columnName: 'nombre', nameToShow: 'Nombre', type: 'string' },
    { columnName: 'costoTotal', nameToShow: 'Costo Total', type: 'number', centerCol: true },
    { columnName: 'proteccion10', nameToShow: 'Proteccion 10%', type: 'number', centerCol: true },
    { columnName: 'iva', nameToShow: 'IVA', type: 'number', centerCol: true },
    { columnName: 'costoFinal', nameToShow: 'Costo Final', type: 'number', centerCol: true },
    { columnName: 'porcentajeCosto', nameToShow: '% Costo', type: 'number', centerCol: true },
    { columnName: 'precioVenta', nameToShow: 'Precio Venta', type: 'number', centerCol: true },
    { columnName: 'tiendas', nameToShow: 'Tiendas', type: 'string', noSort: true },
  ];

  constructor() {
    this.recipesController.SetRawData(this.recipesData());
  }
}
