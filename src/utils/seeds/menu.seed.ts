import { Menu, Permission, PermissionType } from "../../entities/menu";
import dataSource from "../../config/database";

const menusToSeed = [
  { name: "Profit & Loss", path: "/profit-loss", icon: "monetization_on" },
  { name: "Admin", path: "/admin", icon: "admin_panel_settings" },
  { name: "Branch", path: "/branch", icon: "account_tree" },
  { name: "Employee", path: "/employees", icon: "badge" },
  { name: "Roles", path: "/roles", icon: "security" },
  { name: "Role Access", path: "/role-access", icon: "lock_person" },
  { name: "Profile", path: "/profile", icon: "person" },
  { name: "Menu Bar", path: "/menubar", icon: "menu" },
  { name: "Status", path: "/status", icon: "toggle_on" },
  { name: "Product Attribute", path: "/product-attribute", icon: "sell" },
  { name: "Attribute Value", path: "/attribute-value", icon: "label" },
  { name: "Category", path: "/category", icon: "category" },
  { name: "Product", path: "/product", icon: "inventory_2" },
  { name: "Orders", path: "/orders", icon: "shopping_cart" },
  { name: "Change Password", path: "/change-password", icon: "key" },
  { name: "Audit Logs", path: "/audit-logs", icon: "receipt_long" },
  { name: "Alerts", path: "/alerts", icon: "notifications_active" },
  { name: "Attendance", path: "/attendance", icon: "history" },
  { name: "Branch Stocks", path: "/branch-stocks", icon: "store" },
  { name: "Stocks", path: "/stocks", icon: "warehouse" },
  { name: "Payroll", path: "/payroll", icon: "payments" },
  { name: "Leave", path: "/leave", icon: "event_busy" },
  { name: "Delivery Tracking", path: "/delivery-tracking", icon: "local_shipping" },
  { name: "Payments", path: "/payments", icon: "account_balance_wallet" },
  { name: "Notifications", path: "/notifications", icon: "notifications" },
  { name: "Workforce Console", path: "/workforce", icon: "tune" },
  { name: "Shifts & Schedules", path: "/shifts", icon: "schedule" },
  { name: "Break Deduction Rules", path: "/break-policies", icon: "free_breakfast" },
  { name: "Biometric Sensors & Terminals", path: "/biometric", icon: "fingerprint" },
  { name: "GPS Geofencing Boundaries", path: "/geofencing", icon: "location_on" },
  { name: "Company Calendar", path: "/calendar", icon: "calendar_month" },
  { name: "KYC Document Vault", path: "/employee-documents", icon: "folder_shared" },
  { name: "Translation Console", path: "/translations", icon: "translate" },
  { name: "Workforce Requests", path: "/workforce-requests", icon: "assignment" },
  { name: "Invoice Generator", path: "/invoices", icon: "description" },
  { name: "Workflow Approvals", path: "/approvals", icon: "approval" },
  { name: "CRM Contacts", path: "/crm-contacts", icon: "contacts" },
  { name: "Secure Communications", path: "/communication", icon: "chat-dots" },
  { name: "Team Meetings & Calls", path: "/communication/meetings", icon: "camera-video" },
  { name: "Mobility Executive Cockpit", path: "/dashboard/mobility-dashboard", icon: "car-front" },
  { name: "Ride & Taxi Booking", path: "/dashboard/ride-booking", icon: "steering-wheel" },
  { name: "Car Rental & Subscriptions", path: "/dashboard/car-rental", icon: "key" },
  { name: "Parcel & Freight Logistics", path: "/dashboard/parcel-logistics", icon: "truck-front" },
  { name: "Fleet Asset & GPS Control", path: "/dashboard/fleet-management", icon: "radar" },
  { name: "Corporate & School Transit", path: "/dashboard/corporate-transport", icon: "building-gear" },
  { name: "Live GPS Telemetry & Replay", path: "/dashboard/live-tracking", icon: "geo-alt" },
  { name: "KYC & Vehicle Verification", path: "/dashboard/vehicle-driver-verification", icon: "person-check" }
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
          isActive: true
        });
        menu = await menuRepo.save(menu);
        console.log(`🌱 [Seed] Created Menu: ${menu.name} (ID: ${menu.id})`);
        seededCount++;
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
