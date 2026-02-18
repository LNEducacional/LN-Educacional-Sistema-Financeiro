import { PanelLeft } from "lucide-react";
import { Outlet } from "react-router-dom";
import { NotificationBell } from "@/features/notifications";
import { useSidebarState } from "@/lib/hooks/useSidebarState";
import { Sidebar } from "./Sidebar";
import { UserMenu } from "./UserMenu";

export function AppLayout() {
	const sidebar = useSidebarState();

	return (
		<div className="h-screen w-screen bg-black flex overflow-hidden">
			<Sidebar
				state={sidebar.state}
				onToggle={sidebar.toggle}
				isMobile={sidebar.isMobile}
			/>

			{/* Overlay escuro em mobile quando sidebar aberta */}
			{sidebar.isMobile && !sidebar.isHidden && (
				<div
					className="fixed inset-0 bg-black/60 z-40"
					onClick={sidebar.setHidden}
					aria-hidden="true"
				/>
			)}

			{/* Header fixo */}
			<div
				className={`fixed top-0 right-0 h-16 z-30 flex items-center justify-end gap-3 pr-4 sm:pr-6 left-0 ${!sidebar.isMobile && !sidebar.isHidden ? "md:left-64" : ""} transition-all duration-300`}
			>
				<NotificationBell />
				<UserMenu />
			</div>

			{/* Wrapper com padding */}
			<div
				className={`flex-1 pt-16 pr-2 pb-2 sm:pr-3 sm:pb-3 min-w-0 ${sidebar.isHidden || sidebar.isMobile ? "pl-2 sm:pl-3" : ""}`}
			>
				<main className="h-full w-full bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden rounded-3xl">
					<div className="h-full w-full overflow-auto p-4 sm:p-6 custom-scrollbar">
						<Outlet />
					</div>
				</main>
			</div>

			{/* Botao hamburger - sempre visivel em mobile */}
			{(sidebar.isHidden || sidebar.isMobile) && (
				<button
					type="button"
					onClick={sidebar.toggle}
					className="fixed top-0 left-3 z-50 h-16 w-12 flex items-center justify-center bg-transparent text-white rounded-xl hover:bg-zinc-800 transition-colors"
					aria-label="Abrir menu lateral"
				>
					<PanelLeft className="w-5 h-5" />
				</button>
			)}
		</div>
	);
}
