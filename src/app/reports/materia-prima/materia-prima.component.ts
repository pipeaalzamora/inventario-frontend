import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { PaginationController, PaginationControllerCFG } from '@/shared/paginationController';
import { ColumnDefinition, FilterComponent } from '@/shared/components/controller/filter/filter.component';
import { SearchBarComponent } from '@/shared/components/controller/search-bar/search-bar.component';
import { SorterHeaderComponent } from '@/shared/components/controller/sorter-header/sorter-header.component';
import { PaginationComponent } from '@/shared/components/controller/pagination/pagination.component';
import { TableCaptionComponent } from '@/shared/components/controller/table-caption/table-caption.component';
import { DropdownComponent } from '@/shared/components/dropdown/dropdown.component';
import { ClpCurrencyPipe } from '@/shared/pipes/clp-currency.pipe';
import { DecimalPipe } from '@angular/common';

type LograStatus = 'no_logra' | 'logra_medio' | 'logra';

type MateriaPrimaReport = {
  storeName: string;
  inventarioValorizado: number;
  ventas: number;
  costoReal: number;
  costoRealPorcentaje: number;
  costoIdeal: number;
  costoIdealPorcentaje: number;
  diferencia: number;
  realIdealRatio: number;
  faltanteMateriaPrima: number;
  sobrantesMateriaPrima: number;
  faltantesCostoIdealPorcentaje: number;
  sobrantesCostoIdealPorcentaje: number;
  logra: LograStatus;
};

const controllerComponents = [
  FilterComponent,
  SearchBarComponent,
  SorterHeaderComponent,
  PaginationComponent,
  TableCaptionComponent,
];

// Mock data generada
const generateMockData = (): MateriaPrimaReport[] => {
  const stores = [
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
    'MALL PLAZA NORTE',
    'MALL MARINA ARAUCO',
    'MALL ALAMEDA',
    'MALL ANTOFAGASTA',
    'MALL ARAUCO MAIPU',
    'MALL PLAZA NORTE 2',
    'COSTANERA CENTER',
    'BOULEVARD DE VIÑA',
    'PLAZA OESTE 2',
    'LOS DOMINICOS',
    'MALL PLAZA TOBALABA',
    'PLAZA EGAÑA',
    'VIVO IMPERIO',
    'TOBALABA',
    'GUARDIA VIEJA',
    'MALL PLAZA SUR',
    'ESTADO',
    'MANUEL MONTT',
    'TEATINOS',
    'U. DE CHILE',
    'VESPUCIO2',
    'MALL INDEPENDENCIA',
    'FOOD TRUCK',
    'PASEO QUILIN',
    'MALL PLAZA TOBALABA 2',
    'PORTAL ANGAMOS',
  ];
  
  return stores.map((storeName, index) => {
    // Distribuir los estados: logra, logra_medio, no_logra
    const stateIndex = index % 3;
    let costoReal: number;
    let costoIdeal: number;
    let faltanteMateriaPrima: number;
    let sobrantesMateriaPrima: number;
    
    // Generar valores base
    const inventarioValorizado = Math.random() * 10000000 + 5000000;
    const ventas = Math.random() * 8000000 + 3000000;
    
    if (stateIndex === 0) {
      // LOGRA: realIdealRatio <= 3, faltantes <= 5, sobrantes <= 5
      costoIdeal = Math.random() * 2000000 + 1000000;
      costoReal = costoIdeal * (1 + (Math.random() * 2 - 1) * 0.02); // ±2%
      faltanteMateriaPrima = (Math.random() * costoIdeal * 0.03); // <= 3%
      sobrantesMateriaPrima = (Math.random() * costoIdeal * 0.03); // <= 3%
    } else if (stateIndex === 1) {
      // LOGRA MEDIO: combinación que cumple una de las condiciones
      costoIdeal = Math.random() * 2000000 + 1000000;
      costoReal = costoIdeal * (1 + (Math.random() * 2 - 1) * 0.02); // ±2%
      faltanteMateriaPrima = (Math.random() * costoIdeal * 0.06); // ~6%
      sobrantesMateriaPrima = (Math.random() * costoIdeal * 0.03); // <= 3%
    } else {
      // NO LOGRA: valores fuera de rango
      costoIdeal = Math.random() * 2000000 + 1000000;
      costoReal = costoIdeal * (1 + (Math.random() * 2 + 0.05)); // +5% o más
      faltanteMateriaPrima = (Math.random() * costoIdeal * 0.10); // >= 8%
      sobrantesMateriaPrima = (Math.random() * costoIdeal * 0.08); // >= 7%
    }
    
    // Cálculos derivados
    const costoRealPorcentaje = (costoReal / ventas) * 100;
    const costoIdealPorcentaje = (costoIdeal / ventas) * 100;
    const diferencia = costoReal - costoIdeal;
    const realIdealRatio = ((costoReal / costoIdeal) - 1) * 100;
    const faltantesCostoIdealPorcentaje = (faltanteMateriaPrima / costoIdeal) * 100;
    const sobrantesCostoIdealPorcentaje = (sobrantesMateriaPrima / costoIdeal) * 100;
    
    // Cálculo de LOGRA según la fórmula de Excel
    let logra: LograStatus;
    if (realIdealRatio <= 3 && faltantesCostoIdealPorcentaje <= 5 && sobrantesCostoIdealPorcentaje <= 5) {
      logra = 'logra';
    } else if (realIdealRatio >= 3 && faltantesCostoIdealPorcentaje >= 5 && sobrantesCostoIdealPorcentaje >= 5) {
      logra = 'no_logra';
    } else if (
      (realIdealRatio <= 3 && faltantesCostoIdealPorcentaje <= 5 && sobrantesCostoIdealPorcentaje >= 5) ||
      (realIdealRatio <= 3 && faltantesCostoIdealPorcentaje >= 5 && sobrantesCostoIdealPorcentaje <= 5)
    ) {
      logra = 'logra_medio';
    } else {
      logra = 'no_logra';
    }
    
    return {
      storeName,
      inventarioValorizado,
      ventas,
      costoReal,
      costoRealPorcentaje,
      costoIdeal,
      costoIdealPorcentaje,
      diferencia,
      realIdealRatio,
      faltanteMateriaPrima,
      sobrantesMateriaPrima,
      faltantesCostoIdealPorcentaje,
      sobrantesCostoIdealPorcentaje,
      logra,
    };
  });
};

@Component({
  selector: 'dot-materia-prima',
  imports: [
    controllerComponents,
    DropdownComponent,
    ClpCurrencyPipe,
    DecimalPipe,
  ],
  templateUrl: './materia-prima.component.html',
  styleUrl: './materia-prima.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MateriaPrimaComponent {
  protected reportData = signal<MateriaPrimaReport[]>(generateMockData());

  protected lograCount = computed(() => {
    return this.reportData().filter(item => item.logra === 'logra').length;
  });

  protected lograMedioCount = computed(() => {
    return this.reportData().filter(item => item.logra === 'logra_medio').length;
  });

  protected noLograCount = computed(() => {
    return this.reportData().filter(item => item.logra === 'no_logra').length;
  });

  protected reportController = new PaginationController<MateriaPrimaReport>([], <PaginationControllerCFG>{
    defaultSearchColumns: ['storeName'],
    sortColumn: 'logra',
    sortAscending: false,
    pageSize: 50,
  });

  protected reportColumns: ColumnDefinition[] = [
    { columnName: 'logra', nameToShow: 'LOGRA', type: 'string', centerCol: true },
    { columnName: 'storeName', nameToShow: 'Tienda', type: 'string' },
    { columnName: 'inventarioValorizado', nameToShow: 'Inventario Valorizado', type: 'number', centerCol: true },
    { columnName: 'ventas', nameToShow: 'Ventas', type: 'number', centerCol: true },
    { columnName: 'costoReal', nameToShow: 'Costo real', type: 'number', centerCol: true },
    { columnName: 'costoRealPorcentaje', nameToShow: 'Costo Real %', type: 'number', centerCol: true },
    { columnName: 'costoIdeal', nameToShow: 'Costo Ideal', type: 'number', centerCol: true },
    { columnName: 'costoIdealPorcentaje', nameToShow: 'Costo Ideal %', type: 'number', centerCol: true },
    { columnName: 'diferencia', nameToShow: 'Diferencia', type: 'number', centerCol: true },
    { columnName: 'realIdealRatio', nameToShow: 'Real / Ideal', type: 'number', centerCol: true },
    { columnName: 'faltanteMateriaPrima', nameToShow: 'Faltante Materia Prima', type: 'number', centerCol: true, wrapHeader: true },
    { columnName: 'sobrantesMateriaPrima', nameToShow: 'Sobrantes Materia Prima', type: 'number', centerCol: true, wrapHeader: true },
    { columnName: 'faltantesCostoIdealPorcentaje', nameToShow: 'Faltantes / costo ideal %', type: 'number', centerCol: true, wrapHeader: true },
    { columnName: 'sobrantesCostoIdealPorcentaje', nameToShow: 'Sobrantes / costo ideal %', type: 'number', centerCol: true, wrapHeader: true },
  ];

  constructor() {
    this.reportController.SetRawData(this.reportData());
  }

  protected exportToExcel(): void {
    const headers = [
      'LOGRA',
      'Tienda',
      'Inventario Valorizado',
      'Ventas',
      'Costo real',
      'Costo Real %',
      'Costo Ideal',
      'Costo Ideal %',
      'Diferencia',
      'Real / Ideal',
      'Faltante Materia Prima',
      'Sobrantes Materia Prima',
      'Faltantes / costo ideal %',
      'Sobrantes / costo ideal %',
    ];

    const rows = this.reportData().map(item => [
      item.logra === 'logra' ? 'LOGRA' : item.logra === 'logra_medio' ? 'LOGRA MEDIO' : 'NO LOGRA',
      item.storeName,
      item.inventarioValorizado,
      item.ventas,
      item.costoReal,
      item.costoRealPorcentaje,
      item.costoIdeal,
      item.costoIdealPorcentaje,
      item.diferencia,
      item.realIdealRatio,
      item.faltanteMateriaPrima,
      item.sobrantesMateriaPrima,
      item.faltantesCostoIdealPorcentaje,
      item.sobrantesCostoIdealPorcentaje,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'Informe-MateriaPrima.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  protected exportToPDF(): void {
    const headers = [
      'LOGRA',
      'Tienda',
      'Inventario Valorizado',
      'Ventas',
      'Costo real',
      'Costo Real %',
      'Costo Ideal',
      'Costo Ideal %',
      'Diferencia',
      'Real / Ideal',
      'Faltante MP',
      'Sobrantes MP',
      'Faltantes %',
      'Sobrantes %',
    ];

    let pdfContent = 'INFORME MATERIA PRIMA\n\n';
    pdfContent += headers.join('\t') + '\n';
    pdfContent += '-'.repeat(180) + '\n';

    this.reportData().forEach(item => {
      const row = [
        item.logra === 'logra' ? 'LOGRA' : item.logra === 'logra_medio' ? 'LOGRA MEDIO' : 'NO LOGRA',
        item.storeName,
        item.inventarioValorizado.toFixed(0),
        item.ventas.toFixed(0),
        item.costoReal.toFixed(0),
        item.costoRealPorcentaje.toFixed(2),
        item.costoIdeal.toFixed(0),
        item.costoIdealPorcentaje.toFixed(2),
        item.diferencia.toFixed(0),
        item.realIdealRatio.toFixed(2),
        item.faltanteMateriaPrima.toFixed(0),
        item.sobrantesMateriaPrima.toFixed(0),
        item.faltantesCostoIdealPorcentaje.toFixed(2),
        item.sobrantesCostoIdealPorcentaje.toFixed(2),
      ];
      pdfContent += row.join('\t') + '\n';
    });

    const blob = new Blob([pdfContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'Informe-MateriaPrima.txt');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
