export interface Batch {
  id: number;
  product_id: number;
  batch_number: string;
  expiry_date: string;
  stock: number;
  initial_stock: number;
  cost_price: number;
  status?: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'UPCOMING';
  product_name?: string;
  product_code?: string;
}

export interface Product {
  id: number;
  code: string;
  name: string;
  generic_name: string;
  category: string;
  presentation: string;
  laboratory: string;
  prescription_required: number;
  cost_price: number;
  selling_price: number;
  min_stock: number;
  image_url: string;
  description: string;
  warehouse_location: string;
  has_iva?: number;
  iva_percent?: number;
  profit_margin?: number;
  total_stock: number;
  nearest_expiry?: string;
  batches?: Batch[];
}

export interface Customer {
  id: number;
  id_number: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  credit_limit: number;
  current_debt: number;
  credit_days: number;
  notes: string;
  total_purchases?: number;
}

export interface Supplier {
  id: number;
  name: string;
  tax_id: string;
  phone: string;
  email: string;
  address: string;
  contact_person: string;
  balance_due: number;
  total_purchases?: number;
}

export interface Employee {
  id: number;
  name: string;
  id_number: string;
  phone: string;
  role: 'ADMIN' | 'CAJERO' | 'FARMACEUTICO' | 'BODEGUERO';
  shift: string;
  active: number;
  username: string;
  pin: string;
  permissions?: string[];
}

export interface Warehouse {
  id: number;
  code: string;
  name: string;
  location_desc: string;
  is_default: number;
}

export interface CashMovement {
  id: number;
  cash_register_id: number;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  reason: string;
  created_at: string;
}

export interface CashRegisterData {
  isOpen: boolean;
  register?: {
    id: number;
    employee_id: number;
    employee_name?: string;
    opened_at: string;
    opening_balance: number;
    status: string;
    notes?: string;
  };
  openingBalance?: number;
  cashSales?: number;
  otherSales?: Array<{ payment_method: string; total: number; count: number }>;
  movements?: CashMovement[];
  incomes?: number;
  expenses?: number;
  expectedCashInDrawer?: number;
}

export interface OnlineOrderItem {
  id?: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  image_url?: string;
  product_code?: string;
}

export interface Settings {
  id: number;
  pharmacy_name?: string;
  rif?: string;
  sanitary_license?: string;
  phone?: string;
  address?: string;
  welcome_message?: string;
  exchange_rate: number;
  delivery_cost?: number;
  min_free_delivery?: number;
  bank_name: string;
  bank_account_number: string;
  bank_phone: string;
  bank_id_number: string;
  bank_holder: string;
  zelle_email: string;
  zelle_holder: string;
  bcv_last_updated?: string;
  bcv_source?: string;
  bcv_auto_sync?: number;
}

export interface OnlineOrder {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  delivery_type: 'PICKUP' | 'DELIVERY';
  delivery_address?: string;
  payment_method: string;
  payment_currency?: 'USD' | 'BS';
  payment_reference?: string;
  proof_image?: string;
  exchange_rate?: number;
  total_bs?: number;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';
  subtotal: number;
  delivery_fee: number;
  total: number;
  notes?: string;
  created_at: string;
  items?: OnlineOrderItem[];
  sale_id?: number;
  invoice_number?: string;
  processed_by_employee_id?: number;
  processed_by_name?: string;
  cash_register_id?: number;
}

export interface SaleItem {
  id?: number;
  product_id: number;
  product_name?: string;
  product_code?: string;
  batch_number?: string;
  expiry_date?: string;
  quantity: number;
  unit_price: number;
  unit_cost?: number;
  subtotal: number;
}

export interface SalePayment {
  id?: number;
  sale_id?: number;
  payment_method: string;
  currency: 'USD' | 'BS';
  amount: number;
  amount_usd: number;
  amount_bs: number;
  reference?: string;
}

export interface Sale {
  id: number;
  invoice_number: string;
  customer_id: number;
  customer_name?: string;
  customer_phone?: string;
  customer_id_number?: string;
  employee_id: number;
  employee_name?: string;
  sale_type: string;
  payment_method: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  total_bs?: number;
  exchange_rate?: number;
  amount_paid: number;
  change_given: number;
  change_currency?: 'USD' | 'BS';
  change_amount?: number;
  is_credit: number;
  notes?: string;
  created_at: string;
  items?: SaleItem[];
  payments?: SalePayment[];
}
