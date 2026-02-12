import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { Combobox } from '@/components/ui/combobox';
import { Plus, Search, Edit, Trash2, Eye, Calendar, User, Package, Download, FileText, Printer, MoreVertical, X, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { showSuccess, showError } from '@/utils/toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface Order {
  id: string;
  client_id?: string;
  client_name: string;
  total_amount: number;
  discount_percentage: number;
  delivery_fee: number;
  payment_method?: string;
  status: string;
  delivery_date?: string;
  notes?: string;
  created_at: string;
  order_items?: OrderItem[];
}

interface VariationSelection {
  group: string;
  name: string;
  price: number;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  adicionais?: Additional[];
  size?: SizeOption | null;
  variations?: VariationSelection[]; // NOVO
}

interface Client {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  adicionais?: Additional[];
  sizes?: SizeOption[];
  variations?: VariationGroup[]; // 👈 ADICIONE ISSO
}

// E adicione esta interface antes da Product:
interface VariationGroup {
  name: string;
  options: VariationOption[];
}

interface VariationOption {
  name: string;
  price?: number | null;
}

interface SizeOption {
  name: string
  price: number
}

interface Additional {
  name: string;
  price: number;
}

interface OrderItemForm {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  adicionais?: Additional[];
  size?: SizeOption | null;
  variations?: VariationSelection[]; // NOVO
}

const statusOptions = [
  { value: 'orcamento', label: 'Orçamento', color: 'bg-gray-100 text-gray-800' },
  { value: 'confirmado', label: 'Confirmado', color: 'bg-blue-100 text-blue-800' },
  { value: 'producao', label: 'Em Produção', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'pronto', label: 'Pronto', color: 'bg-green-100 text-green-800' },
  { value: 'entregue', label: 'Entregue', color: 'bg-purple-100 text-purple-800' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-100 text-red-800' }
];

const paymentMethods = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'transferencia', label: 'Transferência' }
];

const quickFilters = [
  { key: 'all', label: 'Todos', statuses: [] },
  { key: 'orcamento', label: 'Orçamento', statuses: ['orcamento'] },
  { key: 'finalizados', label: 'Finalizados', statuses: ['entregue'] },
  { key: 'cancelados', label: 'Cancelados', statuses: ['cancelado'] }
];

const Pedidos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [quickFilter, setQuickFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [formData, setFormData] = useState({
    client_id: '',
    client_name: '',
    discount_percentage: '0',
    delivery_fee: '0',
    payment_method: '',
    status: 'orcamento',
    delivery_date: '',
    notes: ''
  });
  const [orderItems, setOrderItems] = useState<OrderItemForm[]>([]);
  const [newItem, setNewItem] = useState<OrderItemForm>({
  product_id: '',
  product_name: '',
  quantity: 1,
  unit_price: 0,
  adicionais: [],
  size: null,
  variations: [] // NOVO
});

  useEffect(() => {
    fetchOrders();
    fetchClients();
    fetchProducts();
  }, []);

const fetchOrders = async () => {
  try {
    console.log('🔍 Fetching orders for user:', user?.id);
    
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        client_id,
        order_items (
          id,
          product_name,
          quantity,
          unit_price,
          total_price,
          adicionais,
          variations
        )
      `)
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }

    console.log('📦 Raw orders data:', data);
    console.log('📦 Raw order_items sample:', data?.[0]?.order_items);

    const parsedData = (data || []).map(order => {
      console.log('🔄 Parsing order:', order.id);
      
      return {
        ...order,
        order_items: order.order_items?.map(item => {
          console.log('  - Parsing item:', item.id, 'Variations raw:', item.variations);
          
          return {
            ...item,
            adicionais: typeof item.adicionais === 'string'
              ? JSON.parse(item.adicionais)
              : item.adicionais || [],
            size: typeof (item as any).size === 'string'
              ? JSON.parse((item as any).size)
              : (item as any).size || null,
            variations: (() => {
              try {
                if (Array.isArray(item.variations)) {
                  console.log('    ✅ Variations is array:', item.variations);
                  return item.variations;
                }
                if (typeof item.variations === 'string') {
                  const parsed = JSON.parse(item.variations);
                  console.log('    ✅ Parsed variations from string:', parsed);
                  return parsed;
                }
                console.log('    ⚠️ No variations found, returning []');
                return [];
              } catch (e) {
                console.error('    ❌ Error parsing variations:', e, 'Value:', item.variations);
                return [];
              }
            })()
          };
        })
      };
    });

    console.log('✅ Parsed orders:', parsedData);
    setOrders(parsedData);
  } catch (error) {
    console.error('❌ Error fetching orders:', error);
    showError('Erro ao carregar pedidos');
  } finally {
    setLoading(false);
  }
};

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', user?.id)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

const fetchProducts = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, adicionais, sizes, variations') // 👈 ADICIONE variations
      .eq('user_id', user?.id)
      .order('name');

    if (error) throw error;
    setProducts(data || []);
  } catch (error) {
    console.error('Error fetching products:', error);
  }
};

  const addItemToOrder = () => {
    if (!newItem.product_name || newItem.quantity <= 0 || newItem.unit_price <= 0) {
      showError('Preencha todos os campos do produto');
      return;
    }

    const item: OrderItemForm = {
      ...newItem,
      product_id: newItem.product_id || '',
      adicionais: newItem.adicionais || [],
      size: newItem.size || null
    };

    setOrderItems([...orderItems, item]);
    setNewItem({
      product_id: '',
      product_name: '',
      quantity: 1,
      unit_price: 0,
      adicionais: [],
      size: null
    });
  };

  const removeItemFromOrder = (index: number) => {
    const updatedItems = orderItems.filter((_, i) => i !== index);
    setOrderItems(updatedItems);
  };

    const resetVariationsForNewProduct = () => {
    setNewItem(prev => ({
      ...prev,
      variations: [],
      size: null,
      adicionais: []
    }));
  };

const calculateSubtotal = () => {
  return orderItems.reduce((sum, item) => {
    const additionalPrice = item.adicionais?.reduce((a, b) => a + b.price, 0) || 0;
    const variationsPrice = item.variations?.reduce((a, b) => a + b.price, 0) || 0; // NOVO
    const base = item.size ? item.size.price : item.unit_price;

    return sum + item.quantity * (base + additionalPrice + variationsPrice); // ATUALIZADO
  }, 0);
};

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal()
    return subtotal * (parseFloat(formData.discount_percentage) / 100)
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const deliveryFee = parseFloat(formData.delivery_fee) || 0;
    return subtotal - discount + deliveryFee;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (orderItems.length === 0) {
      showError('Adicione pelo menos um produto ao pedido');
      return;
    }
    
    try {
      const orderData = {
        client_id: formData.client_id || null,
        client_name: formData.client_name,
        total_amount: calculateTotal(),
        discount_percentage: parseFloat(formData.discount_percentage),
        delivery_fee: parseFloat(formData.delivery_fee),
        payment_method: formData.payment_method || null,
        status: formData.status,
        delivery_date: formData.delivery_date ? new Date(formData.delivery_date).toISOString() : null,
        notes: formData.notes || null,
        user_id: user?.id,
        updated_at: new Date().toISOString()
      };

      let newOrder: Order | null = null;

      if (editingOrder) {
        const { error } = await supabase
          .from('orders')
          .update(orderData)
          .eq('id', editingOrder.id);

        if (error) throw error;
        showSuccess('Pedido atualizado com sucesso!');
      } else {
        const { data, error } = await supabase
          .from('orders')
          .insert(orderData)
          .select()
          .single();

        if (error) throw error;
        newOrder = data;
        showSuccess('Pedido criado com sucesso!');

const orderItemsData = orderItems.map(item => {
  const base = item.size ? item.size.price : item.unit_price;
  const variationsPrice = item.variations?.reduce((a, b) => a + b.price, 0) || 0; // NOVO

  return {
    order_id: newOrder!.id,
    product_id: item.product_id || null,
    product_name: item.product_name,
    quantity: item.quantity,
    unit_price: base,
    total_price: (base + 
      (item.adicionais?.reduce((a, b) => a + b.price, 0) || 0) +
      variationsPrice // NOVO
    ) * item.quantity,
    adicionais: item.adicionais?.length ? item.adicionais : null,
    size: item.size || null,
    variations: item.variations?.length ? item.variations : null // NOVO
  };
});


        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItemsData);

        if (itemsError) throw itemsError;
      }

      setIsDialogOpen(false);
      setEditingOrder(null);
      resetForm();
      fetchOrders();
    } catch (error) {
      console.error('Error saving order:', error);
      showError('Erro ao salvar pedido');
    }
  };

  const handleEdit = (order: Order, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingOrder(order);
    setFormData({
      client_id: order.client_id || '',
      client_name: order.client_name,
      discount_percentage: order.discount_percentage.toString(),
      delivery_fee: order.delivery_fee.toString(),
      payment_method: order.payment_method || '',
      status: order.status,
      delivery_date: order.delivery_date ? order.delivery_date.split('T')[0] : '',
      notes: order.notes || ''
    });
    
if (order.order_items) {
  const items: OrderItemForm[] = order.order_items.map(item => ({
    product_id: item.product_id || '',
    product_name: item.product_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    adicionais: Array.isArray(item.adicionais)
      ? item.adicionais
      : (typeof item.adicionais === 'string'
          ? JSON.parse(item.adicionais)
          : []),
    size: (item as any).size || null,
    variations: Array.isArray((item as any).variations) // NOVO
      ? (item as any).variations
      : (typeof (item as any).variations === 'string'
          ? JSON.parse((item as any).variations)
          : [])
  }));
  setOrderItems(items);
}
   setIsDialogOpen(true);
  };

  const handleView = (orderId: string) => {
    navigate(`/pedidos/${orderId}`);
  };

  const handleDelete = async (orderId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!confirm('Tem certeza que deseja excluir este pedido?')) return;

    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error?.code === '23503') {
        throw new Error('Existem itens vinculados a este pedido');
      } else if (error) {
        throw error;
      }

      showSuccess('Pedido excluído com sucesso!');
      fetchOrders();
    } catch (error: any) {
      console.error('Error deleting order:', error);
      showError(error.message || 'Erro ao excluir pedido');
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select('id, status');

      if (error) throw error;

      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus }
            : order
        )
      );

      const statusLabel = statusOptions.find(s => s.value === newStatus)?.label || newStatus;
      showSuccess(`Status alterado para: ${statusLabel}`);
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      showError(error.message || 'Erro ao atualizar status');
    }
  };

  const handleQuickFilter = (filterKey: string) => {
    setQuickFilter(filterKey);
    const filter = quickFilters.find(f => f.key === filterKey);
    if (filter && filter.statuses.length > 0) {
      setStatusFilter(filter.statuses[0]);
    } else {
      setStatusFilter('all');
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Relatório de Pedidos', 20, 20);
    doc.setFontSize(12);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 20, 30);
    doc.text(`Total de pedidos: ${filteredOrders.length}`, 20, 40);

    const tableData = filteredOrders.map(order => [
      `#${order.id.slice(0, 8)}`,
      order.client_name,
      formatPrice(order.total_amount),
      getStatusLabel(order.status),
      formatDate(order.created_at),
      order.delivery_date ? formatDate(order.delivery_date) : '-'
    ]);

    autoTable(doc, {
      head: [['ID', 'Cliente', 'Valor', 'Status', 'Criado', 'Entrega']],
      body: tableData,
      startY: 50,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] }
    });

    doc.save(`pedidos-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    const data = filteredOrders.map(order => ({
      'ID': `#${order.id.slice(0, 8)}`,
      'Cliente': order.client_name,
      'Valor': order.total_amount,
      'Status': getStatusLabel(order.status),
      'Forma de Pagamento': order.payment_method || '-',
      'Data Criação': formatDate(order.created_at),
      'Data Entrega': order.delivery_date ? formatDate(order.delivery_date) : '-',
      'Observações': order.notes || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
    XLSX.writeFile(wb, `pedidos-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrint = () => {
    const printContent = `
      <html>
        <head>
          <title>Relatório de Pedidos</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .header { margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Relatório de Pedidos</h1>
            <p>Data: ${new Date().toLocaleDateString('pt-BR')}</p>
            <p>Total de pedidos: ${filteredOrders.length}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Data Criação</th>
                <th>Data Entrega</th>
              </tr>
            </thead>
            <tbody>
              ${filteredOrders.map(order => `
                <tr>
                  <td>#${order.id.slice(0, 8)}</td>
                  <td>${order.client_name}</td>
                  <td>${formatPrice(order.total_amount)}</td>
                  <td>${getStatusLabel(order.status)}</td>
                  <td>${formatDate(order.created_at)}</td>
                  <td>${order.delivery_date ? formatDate(order.delivery_date) : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

 const resetForm = () => {
  setFormData({
    client_id: '',
    client_name: '',
    discount_percentage: '0',
    delivery_fee: '0',
    payment_method: '',
    status: 'orcamento',
    delivery_date: '',
    notes: ''
  });
  setOrderItems([]);
  setNewItem({
    product_id: '',
    product_name: '',
    quantity: 1,
    unit_price: 0,
    adicionais: [],
    size: null,
    variations: [] // NOVO
  });
};

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (quickFilter !== 'all') {
      const filter = quickFilters.find(f => f.key === quickFilter);
      if (filter && filter.statuses.length > 0) {
        matchesStatus = filter.statuses.includes(order.status);
      }
    } else if (statusFilter !== 'all') {
      matchesStatus = order.status === statusFilter;
    }
    
    return matchesSearch && matchesStatus;
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const statusOption = statusOptions.find(option => option.value === status);
    return statusOption || statusOptions[0];
  };

  const getStatusLabel = (status: string) => {
    const statusOption = statusOptions.find(option => option.value === status);
    return statusOption?.label || status;
  };

  const tableColumns = [
    {
      key: 'id',
      label: 'Pedido',
      mobileLabel: 'ID',
      render: (value: string, row: Order) => (
        <div>
          <div className="font-medium">#{value.slice(0, 8)}</div>
          <div className="text-sm text-muted-foreground">
            {formatDate(row.created_at)}
          </div>
        </div>
      )
    },
    {
      key: 'client_name',
      label: 'Cliente',
      render: (value: string) => (
        <div className="flex items-center">
          <User className="w-4 h-4 mr-2 text-muted-foreground" />
          <span className="truncate">{value}</span>
        </div>
      )
    },
    {
      key: 'total_amount',
      label: 'Valor',
      render: (value: number, row: Order) => (
        <div>
          <div className="font-medium text-green-600">
            {formatPrice(value)}
          </div>
          {row.delivery_fee > 0 && (
            <div className="text-sm text-muted-foreground">
              + {formatPrice(row.delivery_fee)} entrega
            </div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string, row: Order) => {
        const statusBadge = getStatusBadge(value);
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={value}
              onValueChange={(newValue) => updateOrderStatus(row.id, newValue)}
            >
              <SelectTrigger className="w-32 sm:w-40">
                <SelectValue>
                  <Badge className={statusBadge.color}>
                    {statusBadge.label}
                  </Badge>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem 
                    key={status.value} 
                    value={status.value}
                    className="cursor-pointer"
                  >
                    <Badge className={status.color}>
                      {status.label}
                    </Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      }
    },
    {
      key: 'delivery_date',
      label: 'Entrega',
      hideOnMobile: true,
      render: (value: string) => {
        if (value) {
          return (
            <div className="flex items-center text-sm">
              <Calendar className="w-4 h-4 mr-1" />
              {formatDate(value)}
            </div>
          )
        }
        return <span className="text-muted-foreground">Não definida</span>
      }
    },
    {
      key: 'actions',
      label: 'Ações',
      className: 'text-right',
      render: (value: any, row: Order) => (
        <div className="flex gap-1 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleView(row.id);
            }}
            title="Visualizar pedido"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => handleEdit(row, e)}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => handleDelete(row.id, e)}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }
  ];

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Pedidos</h1>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {/* Quick Filter Buttons */}
            <div className="flex flex-wrap gap-1">
              {quickFilters.map((filter) => (
                <Button
                  key={filter.key}
                  variant={quickFilter === filter.key ? "default" : "outline"}
                  onClick={() => handleQuickFilter(filter.key)}
                  size="sm"
                  className="text-xs"
                >
                  {filter.label}
                </Button>
              ))}
            </div>
            
            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Exportar</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={exportToPDF}>
                  <FileText className="w-4 h-4 mr-2" />
                  Exportar PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToExcel}>
                  <FileText className="w-4 h-4 mr-2" />
                  Exportar Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Add Order Button */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setEditingOrder(null) }}>
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Novo Pedido</span>
                  <span className="sm:hidden">Novo</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingOrder ? 'Editar Pedido' : 'Novo Pedido'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Informações Básicas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="client_name">Cliente *</Label>
                      <Combobox
                        options={clients.map(client => ({ 
                          value: client.id, 
                          label: client.name 
                        }))}
                        value={formData.client_id}
                        onChange={(value) => {
                          const selectedClient = clients.find(c => c.id === value);
                          setFormData({ 
                            ...formData, 
                            client_id: value,
                            client_name: selectedClient?.name || '' 
                          });
                        }}
                        placeholder="Selecione ou digite um cliente..."
                        emptyMessage="Nenhum cliente encontrado."
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="delivery_date">Data de Entrega</Label>
                      <Input
                        id="delivery_date"
                        type="date"
                        value={formData.delivery_date}
                        onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Seção de Produtos */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5" />
                        Produtos do Pedido
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Adicionar Produto */}
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 p-4 bg-muted/30 rounded-lg">
                        <div className="space-y-2">
                          <Label>Produto</Label>
                        <Select 
  value={newItem.product_id} 
  onValueChange={(value) => {
    const product = products.find(p => p.id === value);
    resetVariationsForNewProduct(); // NOVO
    setNewItem({
      ...newItem,
      product_id: value,
      product_name: product?.name || '',
      unit_price: product?.price || 0,
      adicionais: [],
      size: null,
      variations: [] // explícito
    });
  }}
>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map(product => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} - {formatPrice(product.price)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {newItem.product_id &&
  products.find(p => p.id === newItem.product_id)?.sizes?.length > 0 && (

  <div className="space-y-2">
    <Label>Tamanho / Variação</Label>

    <Select
      value={newItem.size?.name || ''}
      onValueChange={(value) => {
        const product = products.find(p => p.id === newItem.product_id)
        const size = product?.sizes?.find(s => s.name === value)

        if (!size) return

        setNewItem({
          ...newItem,
          size,
          unit_price: size.price
        })
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder="Selecione..." />
      </SelectTrigger>

      <SelectContent>
        {products
          .find(p => p.id === newItem.product_id)
          ?.sizes?.map((s, i) => (
            <SelectItem key={i} value={s.name}>
              {s.name} (+{formatPrice(s.price)})
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  </div>
)}
{/* NOVA SEÇÃO - Variações (Cores, Sabores, etc) */}
{newItem.product_id && 
  products.find(p => p.id === newItem.product_id)?.variations?.length > 0 && (
  <div className="space-y-4 mt-4 border-t pt-4">
    {products
      .find(p => p.id === newItem.product_id)
      ?.variations?.map((group, groupIndex) => {
        // Encontra a variação atualmente selecionada para este grupo
        const selectedVariation = newItem.variations?.find(
          v => v.group === group.name
        );
        
        return (
          <div key={groupIndex} className="space-y-2">
            <Label className="font-medium">
              {group.name}
            </Label>
            
            <Select
              value={selectedVariation?.name || ''}
              onValueChange={(value) => {
                // Encontra a opção selecionada
                const option = group.options.find(opt => opt.name === value);
                if (!option) return;
                
                let updatedVariations = [...(newItem.variations || [])];
                
                // Remove qualquer opção já selecionada deste grupo
                updatedVariations = updatedVariations.filter(
                  v => v.group !== group.name
                );
                
                // Adiciona a nova seleção
                updatedVariations.push({
                  group: group.name,
                  name: option.name,
                  price: option.price || 0
                });
                
                setNewItem({
                  ...newItem,
                  variations: updatedVariations
                });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={`Selecione ${group.name.toLowerCase()}...`} />
              </SelectTrigger>
              <SelectContent>
                {group.options.map((option, optIndex) => (
                  <SelectItem key={optIndex} value={option.name}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{option.name}</span>
                      {option.price && option.price > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          +{formatPrice(option.price)}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Mostrar preço adicional se houver */}
            {selectedVariation && selectedVariation.price > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Adicional: {formatPrice(selectedVariation.price)}
              </p>
            )}
          </div>
        );
      })}
  </div>
)}

                          {/* Seção de Adicionais */}
                          {newItem.product_id && products.find(p => p.id === newItem.product_id)?.adicionais?.length > 0 && (
                            <div className="space-y-2 mt-2">
                              <p className="text-sm font-medium">Adicionais:</p>
                              {products.find(p => p.id === newItem.product_id)?.adicionais?.map((add, index) => (
                                <label key={index} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={!!newItem.adicionais?.find(a => a.name === add.name)}
                                    onChange={() => {
                                      const exists = newItem.adicionais?.find(a => a.name === add.name);
                                      const updated = exists
                                        ? newItem.adicionais!.filter(a => a.name !== add.name)
                                        : [...(newItem.adicionais || []), add];
                                      setNewItem({ ...newItem, adicionais: updated });
                                    }}
                                    className="h-4 w-4"
                                  />
                                  <span className="text-sm">
                                    {add.name} (+{formatPrice(add.price)})
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>


                        <div className="space-y-2">
                          <Label>Nome do Produto</Label>
                          <Input
                            value={newItem.product_name}
                            onChange={(e) => setNewItem({ ...newItem, product_name: e.target.value })}
                            placeholder="Nome do produto"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Quantidade</Label>
                          <Input
                            type="number"
                            min="1"
                            value={newItem.quantity}
                            onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Preço Unitário</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={newItem.unit_price}
                            onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Ação</Label>
                          <Button type="button" onClick={addItemToOrder} className="w-full">
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar
                          </Button>
                        </div>
                      </div>
{/* Lista de Produtos */}
{orderItems.length > 0 && (
  <div className="space-y-2">
    <Label>Produtos Adicionados:</Label>
    <div className="border rounded-lg">
      {orderItems.map((item, index) => (
        <div key={index} className="flex items-center justify-between p-3 border-b last:border-b-0">
          <div className="flex-1">
            <div className="font-medium">{item.product_name}</div>
            
            {item.size && (
              <div className="text-sm text-muted-foreground">
                Tamanho: {item.size.name}
              </div>
            )}
            
            {/* Exibir variações */}
            {item.variations && item.variations.length > 0 && (
              <div className="text-sm text-gray-500 mt-1">
                <span className="font-medium">Variações:</span>{" "}
                {item.variations.map((v, i) => (
                  <span key={i}>
                    {v.group}: {v.name} {v.price > 0 && `(+${formatPrice(v.price)})`}
                    {i < item.variations.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>
            )}
            
            <div className="text-sm text-muted-foreground">
              {item.quantity}x {formatPrice(item.unit_price)} = {formatPrice(item.quantity * item.unit_price)}
            </div>
            
            {item.adicionais && item.adicionais.length > 0 && (
              <div className="text-sm text-gray-500 mt-1">
                <span className="font-medium">Adicionais:</span>{" "}
                {item.adicionais.map((a, i) => (
                  <span key={i}>
                    {a.name} (+{formatPrice(a.price)}){i < item.adicionais.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => removeItemFromOrder(index)}
            className="text-red-600 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  </div>
)}

                      {/* Resumo Financeiro */}
                      {orderItems.length > 0 && (
                        <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>{formatPrice(calculateSubtotal())}</span>
                          </div>
                          {parseFloat(formData.discount_percentage) > 0 && (
                            <div className="flex justify-between text-red-600">
                              <span>Desconto ({formData.discount_percentage}%):</span>
                              <span>-{formatPrice(calculateDiscount())}</span>
                            </div>
                          )}
                          {parseFloat(formData.delivery_fee) > 0 && (
                            <div className="flex justify-between">
                              <span>Taxa de Entrega:</span>
                              <span>{formatPrice(parseFloat(formData.delivery_fee))}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-lg font-bold border-t pt-2">
                            <span>TOTAL:</span>
                            <span className="text-green-600">{formatPrice(calculateTotal())}</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Informações Adicionais */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="discount_percentage">Desconto (%)</Label>
                      <Input
                        id="discount_percentage"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.discount_percentage}
                        onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="delivery_fee">Taxa de Entrega</Label>
                      <Input
                        id="delivery_fee"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.delivery_fee}
                        onChange={(e) => setFormData({ ...formData, delivery_fee: e.target.value })}
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="payment_method">Forma de Pagamento</Label>
                      <Select value={formData.payment_method} onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethods.map((method) => (
                            <SelectItem key={method.value} value={method.value}>
                              {method.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Observações do pedido"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                      {editingOrder ? 'Atualizar' : 'Criar'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente ou ID do pedido..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Lista de Pedidos ({filteredOrders.length})</span>
              <Package className="w-5 h-5 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveTable
              data={filteredOrders}
              columns={tableColumns}
              onRowClick={(order) => handleView(order.id)}
              loading={loading}
              emptyMessage={
                searchTerm || quickFilter !== 'all' || statusFilter !== 'all' 
                  ? 'Nenhum pedido encontrado' 
                  : 'Nenhum pedido cadastrado'
              }
            />
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

export default Pedidos
