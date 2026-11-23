import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  UserCheck,
  ClipboardList,
  LayoutDashboard,
  MessageSquare,
  Package,
  ShoppingBasket,
  Store,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

import type { Role } from "@/types/auth";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

/** Public header links. */
export const publicNav: NavItem[] = [
  { title: "Market", href: "/market", icon: Store },
  { title: "About", href: "/about", icon: LayoutDashboard },
];

/** Dashboard sidebar per role. Routes are filled in by later modules. */
export const dashboardNav: Record<Role, NavItem[]> = {
  farmer: [
    { title: "Overview", href: "/farmer", icon: LayoutDashboard },
    { title: "Listings", href: "/farmer/listings", icon: Package },
    { title: "Orders", href: "/farmer/orders", icon: ClipboardList },
    { title: "Earnings", href: "/farmer/earnings", icon: Wallet },
    { title: "Messages", href: "/messages", icon: MessageSquare },
  ],
  buyer: [
    { title: "Market", href: "/market", icon: Store },
    { title: "Cart", href: "/cart", icon: ShoppingBasket },
    { title: "Orders", href: "/orders", icon: ClipboardList },
    { title: "Messages", href: "/messages", icon: MessageSquare },
  ],
  driver: [
    { title: "Current job", href: "/driver", icon: Truck },
    { title: "History", href: "/driver/history", icon: ClipboardList },
  ],
  admin: [
    { title: "Overview", href: "/admin", icon: BarChart3 },
    { title: "Farmer approvals", href: "/admin/farmers", icon: UserCheck },
    { title: "Orders", href: "/admin/orders", icon: ClipboardList },
    { title: "Drivers", href: "/admin/drivers", icon: Truck },
    { title: "Users", href: "/admin/users", icon: Users },
  ],
  agent: [{ title: "My farmers", href: "/agent", icon: Users }],
};
