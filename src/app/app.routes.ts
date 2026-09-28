import { Routes } from '@angular/router';
import { LocationList } from './features/locations/pages/location-list/location-list';
import { LocationCreate } from './features/locations/pages/location-create/location-create';
import { LocationView } from './features/locations/pages/location-view/location-view';
import { VendingMachineList } from './features/vending-machine/pages/vending-machine-list/vending-machine-list';
import { VendingMachineCreate } from './features/vending-machine/pages/vending-machine-create/vending-machine-create';
import { VendingMachineView } from './features/vending-machine/pages/vending-machine-view/vending-machine-view';
import { VendingMachineEdit } from './features/vending-machine/pages/vending-machine-edit/vending-machine-edit';
import { VendingPlanogram } from './features/vending-machine/pages/vending-planogram/vending-planogram';
import { ProductList } from './features/products/pages/product-list/product-list';
import { ProductCreate } from './features/products/pages/product-create/product-create';
import { ProductView } from './features/products/pages/product-view/product-view';
import { ProductEdit } from './features/products/pages/product-edit/product-edit';


export const routes: Routes = [
  {
    path: 'locations',
    component: LocationList,
    data: { title: 'Locations' }
  },
  {
    path: 'locations/create',
    component: LocationCreate,
    data: { title: 'Create Location' }
  },
  {
    path: 'locations/:id/edit',
    loadComponent: () => import('./features/locations/pages/location-edit/location-edit').then(m => m.LocationEditComponent),
    data: { title: 'Edit Location' }
  },
  {
    path: 'locations/:id',
    component: LocationView,
    data: { title: 'Location Details' }
  },
  {
    path: 'vending-machines',
    component: VendingMachineList,
    data: { title: 'Vending Machines' }
  },
  {
    path: 'vending-machines/create',
    component: VendingMachineCreate,
    data: { title: 'Create Vending Machine' }
  },
  {
    path: 'vending-machines/:id/edit',
    component: VendingMachineEdit,
    data: { title: 'Edit Vending Machine' }
  },
  {
    path: 'vending-machines/:id/planogram',
    component: VendingPlanogram,
    data: { title: 'Planogram' }
  },
  {
    path: 'vending-machines/:id',
    component: VendingMachineView,
    data: { title: 'Vending Machine Details' }
  },
  {
    path: 'products',
    component: ProductList,
    data: { title: 'Products' }
  },
  {
    path: 'products/create',
    component: ProductCreate,
    data: { title: 'Create Product' }
  },
  {
    path: 'products/:id/edit',
    component: ProductEdit,
    data: { title: 'Edit Product' }
  },
  {
    path: 'products/:id',
    component: ProductView,
    data: { title: 'Product Details' }
  },
  {
    path: 'events',
    loadComponent: () =>
      import('./features/events/pages/events-dashboard/events-dashboard').then(
        (m) => m.EventsDashboard
      ),
    data: { title: 'Kafka Events Monitor' },
  },
  {
    path: 'events/logs',
    loadComponent: () =>
      import('./features/events/pages/kafka-logs/kafka-logs').then(
        (m) => m.KafkaLogs
      ),
    data: { title: 'Kafka Historical Logs' },
  },
  {
    path: '',
    redirectTo: '/locations',
    pathMatch: 'full'
  }
];
