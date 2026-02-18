import { useCallback, useEffect, useState } from "react";

export type SidebarState = "expanded" | "collapsed" | "hidden";

const STORAGE_KEY = "sidebar-state";
const MOBILE_BREAKPOINT = 768;

function isMobile(): boolean {
	return typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT;
}

function getInitialState(): SidebarState {
	if (typeof window === "undefined") return "expanded";

	if (isMobile()) return "hidden";

	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === "expanded" || stored === "collapsed" || stored === "hidden") {
		return stored;
	}
	return "expanded";
}

export function useSidebarState() {
	const [state, setState] = useState<SidebarState>(getInitialState);
	const [mobile, setMobile] = useState(isMobile);

	useEffect(() => {
		if (!isMobile()) {
			localStorage.setItem(STORAGE_KEY, state);
		}
	}, [state]);

	useEffect(() => {
		const handleResize = () => {
			const nowMobile = isMobile();
			setMobile(nowMobile);
			if (nowMobile) {
				setState("hidden");
			}
		};

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	const toggle = useCallback(() => {
		setState((current) => {
			if (isMobile()) {
				return current === "hidden" ? "expanded" : "hidden";
			}
			switch (current) {
				case "expanded":
					return "collapsed";
				case "collapsed":
					return "hidden";
				case "hidden":
					return "expanded";
			}
		});
	}, []);

	const setExpanded = useCallback(() => setState("expanded"), []);
	const setCollapsed = useCallback(() => setState("collapsed"), []);
	const setHidden = useCallback(() => setState("hidden"), []);

	return {
		state,
		toggle,
		setExpanded,
		setCollapsed,
		setHidden,
		isExpanded: state === "expanded",
		isCollapsed: state === "collapsed",
		isHidden: state === "hidden",
		isMobile: mobile,
	};
}
