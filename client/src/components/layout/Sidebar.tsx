import {
	AlertTriangle,
	Briefcase,
	Cog,
	CreditCard,
	LayoutDashboard,
	Package,
	PanelLeft,
	PanelLeftClose,
	PanelLeftOpen,
	Scale,
	Settings,
	Target,
	Trophy,
	Users,
	Wallet,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import type { SidebarState } from "@/lib/hooks/useSidebarState";

interface NavItem {
	to: string;
	label: string;
	icon: typeof LayoutDashboard;
}

const adminLinks: NavItem[] = [
	{ to: "/admin/reports", label: "Dashboard", icon: LayoutDashboard },
	{ to: "/admin/production", label: "Producao", icon: Target },
	{ to: "/admin/collaborators", label: "Colaboradores", icon: Users },
	{ to: "/admin/withdrawals", label: "Saques", icon: Wallet },
	{ to: "/admin/complaints", label: "Reclamacoes", icon: AlertTriangle },
	{ to: "/disputes", label: "Disputas", icon: Scale },
	{ to: "/admin/services", label: "Servicos", icon: Settings },
	{ to: "/ranking", label: "Ranking", icon: Trophy },
	{ to: "/admin/settings", label: "Configuracoes", icon: Cog },
];

const financeiroLinks: NavItem[] = [
	{ to: "/admin/reports", label: "Dashboard", icon: LayoutDashboard },
	{ to: "/admin/production", label: "Producao", icon: Target },
	{ to: "/admin/collaborators", label: "Colaboradores", icon: Users },
	{ to: "/admin/withdrawals", label: "Saques", icon: Wallet },
	{ to: "/admin/complaints", label: "Reclamacoes", icon: AlertTriangle },
	{ to: "/disputes", label: "Disputas", icon: Scale },
	{ to: "/admin/services", label: "Servicos", icon: Settings },
	{ to: "/ranking", label: "Ranking", icon: Trophy },
];

const collaboratorLinks: NavItem[] = [
	{ to: "/collaborator/dashboard", label: "Dashboard", icon: LayoutDashboard },
	{ to: "/collaborator/production", label: "Minha Producao", icon: Briefcase },
	{ to: "/ranking", label: "Ranking", icon: Trophy },
];

const studentLinks: NavItem[] = [
	{ to: "/student/orders", label: "Meus Pedidos", icon: Package },
	{ to: "/student/payments", label: "Pagamentos", icon: CreditCard },
];

interface SidebarProps {
	state: SidebarState;
	onToggle: () => void;
	isMobile?: boolean;
}

const widthClasses: Record<SidebarState, string> = {
	expanded: "w-56",
	collapsed: "w-16",
	hidden: "w-0 -translate-x-full",
};

export function Sidebar({ state, onToggle, isMobile = false }: SidebarProps) {
	const { user } = useAuth();

	const links =
		user?.role === "ADMIN"
			? adminLinks
			: user?.role === "FINANCEIRO"
				? financeiroLinks
				: user?.role === "COLLABORATOR"
					? collaboratorLinks
					: studentLinks;

	const isExpanded = state === "expanded";
	const isCollapsed = state === "collapsed";

	const ToggleIcon =
		state === "expanded"
			? PanelLeftClose
			: state === "collapsed"
				? PanelLeft
				: PanelLeftOpen;

	const mobileClasses = isMobile
		? state === "hidden"
			? "fixed inset-y-0 left-0 z-50 w-56 -translate-x-full"
			: "fixed inset-y-0 left-0 z-50 w-56 translate-x-0"
		: widthClasses[state];

	return (
		<aside
			className={`
        ${mobileClasses}
        bg-black text-white flex flex-col
        transition-all duration-300 ease-in-out
        overflow-hidden flex-shrink-0
      `}
		>
			{/* Toggle Button */}
			<div className="h-16 flex items-center px-3">
				<button
					type="button"
					onClick={onToggle}
					className={`
            flex items-center gap-2 p-2 rounded-lg
            hover:bg-zinc-800 transition-colors w-full
            ${isCollapsed ? "justify-center" : ""}
          `}
					aria-label="Alternar menu lateral"
				>
					<ToggleIcon className="w-5 h-5 flex-shrink-0" />
					{isExpanded && (
						<span className="text-sm text-zinc-400 truncate">Menu</span>
					)}
				</button>
			</div>

			{/* Navigation */}
			<nav className="flex-1 p-2 overflow-y-auto">
				<ul className="space-y-1">
					{links.map((link) => (
						<li key={link.to}>
							<NavLink
								to={link.to}
								className={({ isActive }) =>
									`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
										isCollapsed ? "justify-center" : ""
									} ${
										isActive
											? "bg-violet-500/20 text-white border-l-4 border-violet-400"
											: "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
									}`
								}
								title={isCollapsed ? link.label : undefined}
							>
								<link.icon className="w-5 h-5 flex-shrink-0" />
								{isExpanded && <span className="truncate">{link.label}</span>}
							</NavLink>
						</li>
					))}
				</ul>
			</nav>
		</aside>
	);
}
