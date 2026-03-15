import type { CountItem } from './count';

export type DiagnosisSeverity = 'consistent' | 'requires_decision' | 'critical_risk';

export type ReconciliationDecision = 'reconcile_transit' | 'adjust_inventory' | 'mark_pending';

export type ReconciliationReason = 
  | 'transit_difference'
  | 'shrinkage'
  | 'unregistered_sale'
  | 'undocumented_entry'
  | 'counting_error'
  | 'other';

export type ReconciliationStatus = 'pending' | 'completed' | 'skipped';

export type MovementHistoryItem = {
  id: string;
  type: 'entrada' | 'salida' | 'ajuste' | 'conteo' | 'venta' | 'compra' | 'transferencia';
  description: string;
  quantity: number;
  date: Date | string;
  user: string;
  reference?: string;
}

export type ReconciliationProduct = CountItem & {
  systemStock: number;
  countedStock: number;
  difference: number;
  differencePercentage: number;
  inTransitIn: number;
  inTransitOut: number;
  committed: number;
  avgCost: number;
  totalCostImpact: number;
  diagnosisSeverity: DiagnosisSeverity;
  diagnosisMessage: string;
  suggestedAction: ReconciliationDecision;
  reconciliationStatus: ReconciliationStatus;
  movementHistory: MovementHistoryItem[];
  decision?: ReconciliationDecision;
  reason?: ReconciliationReason;
  reasonComment?: string;
  reconciledBy?: string;
  reconciledAt?: Date | string;
}

export type DecisionImpact = {
  description: string;
  stockChange: number;
  costImpact: number;
  riskLevel: DiagnosisSeverity;
  affectedReports: string[];
}

export type RadioGroupOption = {
  label: string;
  icon: string;
  type: string;
  disabled?: boolean;
  description?: string;
}

export const DECISION_OPTIONS: RadioGroupOption[] = [
  {
    label: 'Confirmar / reconciliar tránsito',
    icon: 'fa-solid fa-arrows-rotate',
    type: 'reconcile_transit',
    description: 'Se validará que el stock físico es el correcto y se ajustarán los movimientos de tránsito pendientes. No requiere justificación adicional.'
  },
  {
    label: 'Ajustar inventario',
    icon: 'fa-solid fa-sliders',
    type: 'adjust_inventory',
    description: 'Se realizará un ajuste de inventario para igualar el stock del sistema al conteo físico. Esta acción afectará el kardex y la valorización.'
  },
  {
    label: 'Marcar pendiente y bloquear movimientos',
    icon: 'fa-solid fa-lock',
    type: 'mark_pending',
    description: 'El producto quedará bloqueado para movimientos hasta que se investigue y resuelva la diferencia. Ideal cuando hay dudas sobre el origen de la diferencia.'
  }
];

export const REASON_OPTIONS: RadioGroupOption[] = [
  {
    label: 'Diferencia por tránsito',
    icon: 'fa-solid fa-truck',
    type: 'transit_difference',
    description: 'La diferencia se explica por mercancía en tránsito que aún no ha sido recibida o despachada.'
  },
  {
    label: 'Merma',
    icon: 'fa-solid fa-chart-line-down',
    type: 'shrinkage',
    description: 'Pérdida de inventario por deterioro, robo, o daño no documentado.'
  },
  {
    label: 'Venta no registrada',
    icon: 'fa-solid fa-receipt',
    type: 'unregistered_sale',
    description: 'Se vendió producto sin registrar la transacción en el sistema.'
  },
  {
    label: 'Ingreso no documentado',
    icon: 'fa-solid fa-box-open',
    type: 'undocumented_entry',
    description: 'Se recibió producto sin registrar la entrada en el sistema.'
  },
  {
    label: 'Error de conteo',
    icon: 'fa-solid fa-calculator',
    type: 'counting_error',
    description: 'El conteo físico fue realizado incorrectamente o hay discrepancias en la metodología.'
  },
  {
    label: 'Otro',
    icon: 'fa-solid fa-ellipsis',
    type: 'other',
    description: 'Otro motivo no listado. Por favor especifique en el comentario adicional.'
  }
];

export function generateMockReconciliationData(countItem: CountItem, index: number): ReconciliationProduct {
  // Generate varied mock data based on index for demonstration
  const baseCount = countItem.unitsCount[0]?.count ?? 0;
  const variance = (index % 3 === 0) ? -5 : (index % 3 === 1) ? 3 : -2;
  const systemStock = baseCount + variance;
  const countedStock = baseCount;
  const difference = countedStock - systemStock;
  const differencePercentage = systemStock > 0 ? Math.round((difference / systemStock) * 100) : 0;

  // Determine severity based on difference
  let diagnosisSeverity: DiagnosisSeverity;
  let diagnosisMessage: string;
  let suggestedAction: ReconciliationDecision;

  if (Math.abs(differencePercentage) <= 2) {
    diagnosisSeverity = 'consistent';
    diagnosisMessage = 'La diferencia está dentro del margen aceptable. Puede deberse a redondeo o pequeñas variaciones.';
    suggestedAction = 'reconcile_transit';
  } else if (Math.abs(differencePercentage) <= 10) {
    diagnosisSeverity = 'requires_decision';
    diagnosisMessage = difference > 0 
      ? 'Hay más stock físico que en el sistema. Posible ingreso no documentado o error en registro de salidas.'
      : 'Hay menos stock físico que en el sistema. Posible merma, venta no registrada o error de conteo.';
    suggestedAction = 'adjust_inventory';
  } else {
    diagnosisSeverity = 'critical_risk';
    diagnosisMessage = 'Diferencia significativa detectada. Se recomienda investigación antes de ajustar. Existe riesgo de stock negativo si se procede.';
    suggestedAction = 'mark_pending';
  }

  // Mock movement history
  const movementHistory: MovementHistoryItem[] = [
    {
      id: `mov-${index}-1`,
      type: 'venta',
      description: 'Venta POS #4521',
      quantity: -2,
      date: new Date(Date.now() - 1000 * 60 * 60 * 24),
      user: 'María García',
      reference: 'POS-4521'
    },
    {
      id: `mov-${index}-2`,
      type: 'compra',
      description: 'Recepción OC #1234',
      quantity: 10,
      date: new Date(Date.now() - 1000 * 60 * 60 * 48),
      user: 'Carlos López',
      reference: 'OC-1234'
    },
    {
      id: `mov-${index}-3`,
      type: 'transferencia',
      description: 'Transferencia desde Bodega Central',
      quantity: 5,
      date: new Date(Date.now() - 1000 * 60 * 60 * 72),
      user: 'Ana Martínez',
      reference: 'TRF-0892'
    },
    {
      id: `mov-${index}-4`,
      type: 'conteo',
      description: 'Conteo anterior',
      quantity: systemStock + 3,
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
      user: 'Juan Pérez',
      reference: 'CNT-0156'
    }
  ];

  const avgCost = 150 + (index * 25);
  const totalCostImpact = Math.abs(difference) * avgCost;

  return {
    ...countItem,
    systemStock,
    countedStock,
    difference,
    differencePercentage,
    inTransitIn: index % 2 === 0 ? 3 : 0,
    inTransitOut: index % 3 === 0 ? 2 : 0,
    committed: index % 4 === 0 ? 5 : 0,
    avgCost,
    totalCostImpact,
    diagnosisSeverity,
    diagnosisMessage,
    suggestedAction,
    reconciliationStatus: 'pending',
    movementHistory
  };
}
