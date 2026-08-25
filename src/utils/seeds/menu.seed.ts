import { Menu, Permission, PermissionType } from "../../entities/menu";
import dataSource from "../../config/database";

const menusToSeed = [
  { name: 'Admin', path: '/admin', icon: 'admin_panel_settings', webIcon: 'bi-shield-lock-fill', appIcon: 'admin_panel_settings' },
  { name: 'Branches', path: '/branch', icon: 'account_tree', webIcon: 'bi-building-fill', appIcon: 'account_tree' },
  { name: 'Employees', path: '/employees', icon: 'badge', webIcon: 'bi-people-fill', appIcon: 'badge' },
  { name: 'Roles', path: '/roles', icon: 'security', webIcon: 'bi-key-fill', appIcon: 'security' },
  { name: 'Role Access', path: '/role-access', icon: 'lock_person', webIcon: 'bi-shield-check', appIcon: 'lock_person' },
  { name: 'Profile', path: '/profile', icon: 'person', webIcon: 'bi-person-badge-fill', appIcon: 'person' },
  { name: 'Menu Management', path: '/menubar', icon: 'menu', webIcon: 'bi-list-stars', appIcon: 'menu' },
  { name: 'Statuses', path: '/status', icon: 'toggle_on', webIcon: 'bi-check2-square', appIcon: 'toggle_on' },
  { name: 'Attributes', path: '/product-attribute', icon: 'sell', webIcon: 'bi-sliders', appIcon: 'sell' },
  { name: 'Categories', path: '/category', icon: 'category', webIcon: 'bi-folder-fill', appIcon: 'category' },
  { name: 'Products', path: '/product', icon: 'inventory_2', webIcon: 'bi-box-seam-fill', appIcon: 'inventory_2' },
  { name: 'Units Master', path: '/units', icon: 'square_foot', webIcon: 'bi-rulers', appIcon: 'square_foot' },
  { name: 'Orders', path: '/orders', icon: 'shopping_cart', webIcon: 'bi-bag-check-fill', appIcon: 'shopping_cart' },
  { name: 'Coupons', path: '/coupons', icon: 'confirmation_number', webIcon: 'bi-ticket-perforated-fill', appIcon: 'confirmation_number' },
  { name: 'Change Password', path: '/change-password', icon: 'key', webIcon: 'bi-lock-fill', appIcon: 'key' },
  { name: 'Audit Logs', path: '/audit-logs', icon: 'receipt_long', webIcon: 'bi-clock-history', appIcon: 'receipt_long' },
  { name: 'Alerts', path: '/alerts', icon: 'notifications_active', webIcon: 'bi-exclamation-triangle-fill', appIcon: 'notifications_active' },
  { name: 'Attendance', path: '/attendance', icon: 'history', webIcon: 'bi-calendar-check-fill', appIcon: 'history' },
  { name: 'Branch Inventory', path: '/branch-stocks', icon: 'store', webIcon: 'bi-houses-fill', appIcon: 'store' },
  { name: 'Stock Control', path: '/stocks', icon: 'warehouse', webIcon: 'bi-boxes', appIcon: 'warehouse' },
  { name: 'Payroll', path: '/payroll', icon: 'payments', webIcon: 'bi-cash-coin', appIcon: 'payments' },
  { name: 'Leave Management', path: '/leave', icon: 'event_busy', webIcon: 'bi-airplane-fill', appIcon: 'event_busy' },
  { name: 'Deliveries', path: '/delivery-tracking', icon: 'local_shipping', webIcon: 'bi-truck', appIcon: 'local_shipping' },
  { name: 'Payments', path: '/payments', icon: 'account_balance_wallet', webIcon: 'bi-credit-card-2-front-fill', appIcon: 'account_balance_wallet' },
  { name: 'Notifications', path: '/notifications', icon: 'notifications', webIcon: 'bi-bell-fill', appIcon: 'notifications' },
  { name: 'Workforce', path: '/workforce', icon: 'tune', webIcon: 'bi-gear-wide-connected', appIcon: 'tune' },
  { name: 'Invoices', path: '/invoices', icon: 'description', webIcon: 'bi-file-earmark-text-fill', appIcon: 'description' },
  { name: 'Approvals', path: '/approvals', icon: 'approval', webIcon: 'bi-patch-check-fill', appIcon: 'approval' },
  { name: 'Workforce Requests', path: '/workforce-requests', icon: 'assignment', webIcon: 'bi-briefcase-fill', appIcon: 'assignment' },
  { name: 'CRM Contacts', path: '/crm-contacts', icon: 'contacts', webIcon: 'bi-person-rolodex', appIcon: 'contacts' },
  { name: 'Profit & Loss', path: '/profit-loss', icon: 'monetization_on', webIcon: 'bi-pie-chart-fill', appIcon: 'monetization_on' },
  { name: 'Plan Admin', path: '/manage-subscription-plans', icon: 'diamond', webIcon: 'bi-gem', appIcon: 'diamond' },
  { name: 'Subscription', path: '/subscription-plans', icon: 'star', webIcon: 'bi-star-fill', appIcon: 'star' },
  { name: 'Billing', path: '/billing-history', icon: 'receipt', webIcon: 'bi-receipt', appIcon: 'receipt' },
  { name: 'Plan Coupons', path: '/subscription-coupons', icon: 'card_giftcard', webIcon: 'bi-ticket-detailed-fill', appIcon: 'card_giftcard' },
  { name: 'Checkout', path: '/checkout', icon: 'payment', webIcon: 'bi-credit-card-fill', appIcon: 'payment' },
  { name: 'Calendar', path: '/calendar', icon: 'calendar_month', webIcon: 'bi-calendar-event-fill', appIcon: 'calendar_month' },
  { name: 'Documents', path: '/employee-documents', icon: 'folder_shared', webIcon: 'bi-file-earmark-check-fill', appIcon: 'folder_shared' },
  { name: 'Translations', path: '/translations', icon: 'translate', webIcon: 'bi-translate', appIcon: 'translate' },
  { name: 'POS Terminal', path: '/pos-billing', icon: 'point_of_sale', webIcon: 'bi-calculator-fill', appIcon: 'point_of_sale' },
  { name: 'Devices', path: '/devices', icon: 'devices', webIcon: 'bi-cpu-fill', appIcon: 'devices' },
  { name: 'Chat', path: '/communication', icon: 'forum', webIcon: 'bi-chat-dots-fill', appIcon: 'forum' },
  { name: 'Meetings', path: '/communication/meetings', icon: 'videocam', webIcon: 'bi-camera-video-fill', appIcon: 'videocam' },
  { name: 'Mobility Hub', path: '/mobility-dashboard', icon: 'directions_car', webIcon: 'bi-car-front-fill', appIcon: 'directions_car' },
  { name: 'Rides', path: '/ride-booking', icon: 'local_taxi', webIcon: 'bi-steering-wheel', appIcon: 'local_taxi' },
  { name: 'Car Rentals', path: '/car-rental', icon: 'car_rental', webIcon: 'bi-key-fill', appIcon: 'car_rental' },
  { name: 'Logistics', path: '/parcel-logistics', icon: 'local_shipping', webIcon: 'bi-truck-front-fill', appIcon: 'local_shipping' },
  { name: 'Fleet', path: '/fleet-management', icon: 'radar', webIcon: 'bi-radar', appIcon: 'radar' },
  { name: 'Transit', path: '/corporate-transport', icon: 'directions_bus', webIcon: 'bi-building-fill-gear', appIcon: 'directions_bus' },
  { name: 'Live Tracking', path: '/live-tracking', icon: 'location_searching', webIcon: 'bi-geo-alt-fill', appIcon: 'location_searching' },
  { name: 'Driver Verification', path: '/vehicle-driver-verification', icon: 'verified_user', webIcon: 'bi-person-check-fill', appIcon: 'verified_user' }
];

export async function seedMenus() {
  try {
    const menuRepo = dataSource.getRepository(Menu);
    const permissionRepo = dataSource.getRepository(Permission);
    const actions = Object.values(PermissionType);

    let seededCount = 0;

    for (const item of menusToSeed) {
      let menu = await menuRepo.findOne({
        where: { path: item.path }
      });

      if (!menu) {
        menu = await menuRepo.findOne({
          where: { name: item.name }
        });
      }

      if (!menu) {
        menu = menuRepo.create({
          name: item.name,
          path: item.path,
          icon: item.icon,
          webIcon: item.webIcon,
          appIcon: item.appIcon,
          isActive: true
        });
        menu = await menuRepo.save(menu);
        console.log(`🌱 [Seed] Created Menu: ${menu.name} (ID: ${menu.id})`);
        seededCount++;
      } else {
        let updated = false;
        if (menu.name !== item.name) {
          menu.name = item.name;
          updated = true;
        }
        if (!menu.webIcon || menu.webIcon !== item.webIcon) {
          menu.webIcon = item.webIcon;
          updated = true;
        }
        if (!menu.appIcon || menu.appIcon !== item.appIcon) {
          menu.appIcon = item.appIcon;
          updated = true;
        }
        if (updated) {
          await menuRepo.save(menu);
        }
      }

      const existingPermissions = await permissionRepo.find({
        where: { menu_id: menu.id }
      });
      const existingActions = new Set(existingPermissions.map(p => p.action));

      const missingActions = actions.filter(a => !existingActions.has(a));
      if (missingActions.length > 0) {
        const newPerms = missingActions.map(action =>
          permissionRepo.create({ menu_id: menu.id, action: action as PermissionType })
        );
        await permissionRepo.save(newPerms);
      }
    }

    if (seededCount > 0) {
      console.log(`🌱 [Seed] Menu seeding completed. Added ${seededCount} new menus.`);
    } else {
      console.log("🌱 [Seed] All menus and permissions are already up to date.");
    }
  } catch (error) {
    console.error("🌱 [Seed] Menu seeding error:", error);
  }
}
