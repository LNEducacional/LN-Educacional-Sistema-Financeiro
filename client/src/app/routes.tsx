import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AppLayout } from "../components/layout";
import {
	CollaboratorDetailPage,
	CollaboratorsPage,
	ComplaintsPage,
	ReportsDashboard,
	SettingsPage,
} from "../features/admin";
import { WithdrawalsPage } from "../features/admin/withdrawals";
import { useAuth } from "../features/auth/AuthContext";
import { ForgotPasswordPage } from "../features/auth/components/ForgotPasswordPage";
import { LoginForm } from "../features/auth/components/LoginForm";
import { ResetPasswordPage } from "../features/auth/components/ResetPasswordPage";
import { CollaboratorDashboardPage } from "../features/collaborator";
import {
	DisputeDetailPage,
	DisputesListPage,
	OpenDisputePage,
} from "../features/disputes";
import { NotificationsPage } from "../features/notifications";
import {
	AdminDashboard as ProductionAdminDashboard,
	CollaboratorDashboard as ProductionCollaboratorDashboard,
} from "../features/production";
import { RankingPage } from "../features/ranking";
import { ServicesPage } from "../features/services";
import {
	OrderDetailsPage,
	OrdersListPage,
	PaymentsPage,
} from "../features/student";

const ProtectedRoute = ({ allowedRoles }: { allowedRoles: string[] }) => {
	const { isAuthenticated, isLoading, user } = useAuth();

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-900">
				<div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
			</div>
		);
	}

	if (!isAuthenticated) {
		return <Navigate to="/login" />;
	}

	if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role ?? "")) {
		return <Navigate to="/unauthorized" />;
	}

	return <Outlet />;
};

const Unauthorized = () => <div>Unauthorized</div>;

export const AppRoutes = () => {
	return (
		<Routes>
			<Route path="/login" element={<LoginForm />} />
			<Route path="/forgot-password" element={<ForgotPasswordPage />} />
			<Route path="/reset-password/:token" element={<ResetPasswordPage />} />
			<Route path="/unauthorized" element={<Unauthorized />} />

			{/* All protected routes wrapped with AppLayout */}
			<Route element={<ProtectedRoute allowedRoles={[]} />}>
				<Route element={<AppLayout />}>
					{/* ADMIN only routes */}
					<Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
						<Route path="/admin/settings" element={<SettingsPage />} />
					</Route>

					{/* ADMIN + FINANCEIRO routes (financial access) */}
					<Route
						element={<ProtectedRoute allowedRoles={["ADMIN", "FINANCEIRO"]} />}
					>
						<Route path="/admin/services" element={<ServicesPage />} />
						<Route path="/admin/reports" element={<ReportsDashboard />} />
						<Route
							path="/admin/collaborators"
							element={<CollaboratorsPage />}
						/>
						<Route
							path="/admin/collaborators/:id"
							element={<CollaboratorDetailPage />}
						/>
						<Route path="/admin/withdrawals" element={<WithdrawalsPage />} />
						<Route
							path="/admin/production"
							element={<ProductionAdminDashboard />}
						/>
						<Route path="/admin/complaints" element={<ComplaintsPage />} />
						<Route path="/disputes" element={<DisputesListPage />} />
					</Route>

					{/* COLLABORATOR routes */}
					<Route element={<ProtectedRoute allowedRoles={["COLLABORATOR"]} />}>
						<Route
							path="/collaborator/dashboard"
							element={<CollaboratorDashboardPage />}
						/>
						<Route
							path="/collaborator/production"
							element={<ProductionCollaboratorDashboard />}
						/>
					</Route>

					{/* Shared routes (COLLABORATOR + ADMIN + FINANCEIRO) */}
					<Route
						element={
							<ProtectedRoute
								allowedRoles={["COLLABORATOR", "ADMIN", "FINANCEIRO"]}
							/>
						}
					>
						<Route path="/ranking" element={<RankingPage />} />
					</Route>

					{/* STUDENT routes */}
					<Route element={<ProtectedRoute allowedRoles={["STUDENT"]} />}>
						<Route path="/student/orders" element={<OrdersListPage />} />
						<Route path="/student/orders/:id" element={<OrderDetailsPage />} />
						<Route
							path="/student/payments"
							element={<PaymentsPage />}
						/>
						<Route
							path="/orders/:orderId/dispute"
							element={<OpenDisputePage />}
						/>
					</Route>

					{/* Shared routes - accessible by all authenticated roles */}
					<Route
						element={
							<ProtectedRoute
								allowedRoles={[
									"ADMIN",
									"FINANCEIRO",
									"STUDENT",
									"COLLABORATOR",
								]}
							/>
						}
					>
						<Route path="/disputes/:id" element={<DisputeDetailPage />} />
						<Route path="/notifications" element={<NotificationsPage />} />
					</Route>
				</Route>
			</Route>

			<Route path="*" element={<Navigate to="/login" />} />
		</Routes>
	);
};
