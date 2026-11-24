import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  UserCheck,
  ClipboardList,
  HandCoins,
  LayoutDashboard,
  MessageSquare,
  Package,
  RotateCcw,
  Route,
  ShoppingBasket,
  Store,
  TriangleAlert,
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
    { title: "My trips", href: "/driver", icon: Truck },
    { title: "Past trips", href: "/driver/history", icon: ClipboardList },
  ],
  admin: [
    { title: "Today", href: "/admin", icon: BarChart3 },
    { title: "Orders", href: "/admin/orders", icon: ClipboardList },
    { title: "Trips", href: "/admin/trips", icon: Route },
    { title: "Payouts", href: "/admin/payouts", icon: HandCoins },
    { title: "Refunds", href: "/admin/refunds", icon: RotateCcw },
    { title: "Problems", href: "/admin/problems", icon: TriangleAlert },
    { title: "Farmer approvals", href: "/admin/farmers", icon: UserCheck },
    { title: "Drivers", href: "/admin/drivers", icon: Truck },
    { title: "Users", href: "/admin/users", icon: Users },
  ],
  agent: [{ title: "My farmers", href: "/agent", icon: Users }],
};
