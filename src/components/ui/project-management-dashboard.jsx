import React, {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";

const spacing = {
  page: { header: "px-4 sm:px-6 lg:px-8 py-4", sidebar: "px-2 sm:px-3 py-4", main: "px-4 sm:px-6 lg:px-8 py-4", messages: "px-4 sm:px-6 py-4" },
  card: { base: "p-4 sm:p-5 lg:p-6", compact: "p-3 sm:p-4" },
  button: { sm: "px-2.5 py-1.5", md: "px-3 py-2", lg: "px-4 py-2.5" },
  gap: { xs: "gap-2", sm: "gap-3", md: "gap-4", lg: "gap-6" }
};

const cx = (...classes) => classes.filter(Boolean).join(" ");
const parseDateLike = (v) => { if (!v) return 0; const ts = Date.parse(v); return Number.isNaN(ts) ? 0 : ts; };
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
const readLS = (key, fallback) => { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } };
const writeLS = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };

const Icons = {
  Dots: (props) => ( <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></svg> ),
  Grid: (props) => ( <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" stroke="currentColor" strokeWidth="2" fill="none" /></svg> ),
  List: (props) => ( <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" fill="none" /></svg> ),
  Bell: (props) => ( <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" /></svg> ),
  Search: (props) => ( <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" /><path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" /></svg> ),
  Theme: (props) => ( <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" fill="none" /></svg> ),
  Plus: (props) => ( <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="3" /></svg> ),
  Trash: (props) => ( <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><path d="M3 6h18M8 6V4h8v2m-1 0v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6" stroke="currentColor" strokeWidth="2" fill="none"/></svg> ),
  Home: (props) => ( <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-10.5z" stroke="currentColor" strokeWidth="2" fill="none" /></svg> ),
  Chart: (props) => ( <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><path d="M4 19V5M10 19V9M16 19V3M22 19H2" stroke="currentColor" strokeWidth="2" fill="none" /></svg> ),
  Calendar: (props) => ( <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><path d="M7 2v4M17 2v4M3 8h18M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="2" fill="none" /></svg> ),
  Settings: (props) => ( <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.8 1.8 0 0 0 15 19.4a1.8 1.8 0 0 0-1 .33 1.8 1.8 0 0 0-.82 1.51V21.5a2 2 0 1 1-4 0v-.26A1.8 1.8 0 0 0 7 19.4a1.8 1.8 0 0 0-1.98-.36l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-.33-1 1.8 1.8 0 0 0-1.51-.82H2.5a2 2 0 1 1 0-4h.26A1.8 1.8 0 0 0 4.6 7a1.8 1.8 0 0 0-.36-1.98l-.06-.06A2 2 0 1 1 7.01 2.13l.06.06A1.8 1.8 0 0 0 9 4.6c.34 0 .67-.11 1-.33.46-.31.77-.82.82-1.38V2.5a2 2 0 1 1 4 0v.26c.05.56.36 1.07.82 1.38.33.22.66.33 1 .33a1.8 1.8 0 0 0 1.98-.36l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.8 1.8 0 0 0 19.4 9c0 .34.11.67.33 1 .31.46.82.77 1.38.82h.39a2 2 0 1 1 0 4h-.39c-.56.05-1.07.36-1.38.82-.22.33-.33.66-.33 1z" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg> ),
  Close: (props) => ( <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" /></svg> ),
  Logo: (props) => ( <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><path d="M4 7h16M7 12h10M10 17h4" stroke="currentColor" strokeWidth="2" fill="none" /></svg> ),
  Chat: (props) => ( <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5Z" stroke="currentColor" strokeWidth="2" fill="none" /></svg> ),
  Star: (props) => ( <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><path d="M12 2l3.1 6.3L22 9.3l-5 4.9 1.2 7-6.2-3.4L5.8 21l1.2-6.8-5-4.9 6.9-1z" fill="currentColor" /></svg> ),
  Arrow: (props) => ( <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><path d="M12 5v14m7-7-7 7-7-7" stroke="currentColor" strokeWidth="2" fill="none" /></svg> ),
  Edit: (props) => ( <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" fill="none"/></svg> ),
  MessageCircle: (props) => ( <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" stroke="currentColor" strokeWidth="2" fill="none"/></svg> )
};

export function ProjectDashboard({
  title = "Pipeline",
  user = { name: "You", avatarUrl: "" },
  sidebarLinks = [],
  stats,
  projects,
  kanbanColumns,
  messages = [],
  view, defaultView = "grid", onViewChange,
  searchQuery, defaultSearchQuery = "", onSearchQueryChange, showSearch = true, searchPlaceholder = "Search",
  messagesOpen, defaultMessagesOpen = false, onMessagesOpenChange,
  sortBy, defaultSortBy = "date", sortDir, defaultSortDir = "desc", onSortChange,
  statusFilter, defaultStatusFilter = "all", onStatusFilterChange,
  pageSize = 50, initialPage = 1, onPageChange,
  virtualizeList = false, estimatedRowHeight = 140,
  onProjectClick, onProjectAction, onProjectUpdate, onProjectsReorder,
  allowCreate = true, onProjectCreate, generateId, onMessageStarChange,
  showThemeToggle = true, onToggleTheme, theme, defaultTheme = "system", onThemeChange,
  persistKey, className = "", loading = false, emptyProjectsLabel = "No projects found.", emptyMessagesLabel = "No messages yet.",
}) {
  const lsKey = persistKey ? (k) => `pd:${persistKey}:${k}` : null;

  const [internalView, setInternalView] = useState(lsKey ? readLS(lsKey("view"), defaultView) : defaultView);
  const viewMode = view ?? internalView;

  const [internalQuery, setInternalQuery] = useState(lsKey ? readLS(lsKey("query"), defaultSearchQuery) : defaultSearchQuery);
  const query = searchQuery ?? internalQuery;

  const [internalMessagesOpen, setInternalMessagesOpen] = useState(lsKey ? readLS(lsKey("messagesOpen"), defaultMessagesOpen) : defaultMessagesOpen);
  const isMessagesOpen = messagesOpen ?? internalMessagesOpen;

  const [internalSortBy, setInternalSortBy] = useState(lsKey ? readLS(lsKey("sortBy"), defaultSortBy) : defaultSortBy);
  const [internalSortDir, setInternalSortDir] = useState(lsKey ? readLS(lsKey("sortDir"), defaultSortDir) : defaultSortDir);
  const activeSortBy = sortBy ?? internalSortBy;
  const activeSortDir = sortDir ?? internalSortDir;

  const [internalStatusFilter, setInternalStatusFilter] = useState(lsKey ? readLS(lsKey("statusFilter"), defaultStatusFilter) : defaultStatusFilter);
  const activeStatusFilter = statusFilter ?? internalStatusFilter;

  const [page, setPage] = useState(lsKey ? readLS(lsKey("page"), initialPage) : initialPage);
  const [localProjects, setLocalProjects] = useState(projects);
  
  useEffect(() => {
    if (onProjectUpdate || onProjectsReorder) return;
    setLocalProjects(projects);
  }, [projects, onProjectUpdate, onProjectsReorder]);

  const dataProjects = onProjectUpdate || onProjectsReorder ? projects : localProjects;

  const searchInputId = useId();
  const statusSelectId = useId();

  const computedStats = useMemo(() => {
    if (stats) return stats;
    const total = dataProjects.length;
    const byStatus = dataProjects.reduce(
      (acc, p) => {
        const pStatus = p.status || "inProgress";
        if (acc[pStatus] !== undefined) acc[pStatus]++;
        return acc;
      },
      { inProgress: 0, upcoming: 0, completed: 0, paused: 0 }
    );
    return [
      { id: "inProgress", label: "In Progress", value: byStatus.inProgress },
      { id: "upcoming", label: "Upcoming", value: byStatus.upcoming },
      { id: "total", label: "Total Projects", value: total },
    ];
  }, [stats, dataProjects]);

  const orderMap = useMemo(() => {
    const map = new Map();
    dataProjects.forEach((p, i) => map.set(p.id, i));
    return map;
  }, [dataProjects]);

  const preparedProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = dataProjects.slice();

    if (activeStatusFilter !== "all") {
      list = list.filter((p) => (p.status ?? "inProgress") === activeStatusFilter);
    }
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.subtitle?.toLowerCase().includes(q) ?? false)
      );
    }

    list.sort((a, b) => {
      let cmp = 0;
      switch (activeSortBy) {
        case "manual": cmp = (orderMap.get(a.id) - orderMap.get(b.id)); break;
        case "date": cmp = parseDateLike(a.date) - parseDateLike(b.date); break;
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "progress": cmp = (a.progress ?? 0) - (b.progress ?? 0); break;
      }
      return activeSortBy === "manual" ? cmp : activeSortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [dataProjects, query, activeSortBy, activeSortDir, activeStatusFilter, orderMap]);

  const totalPages = virtualizeList ? 1 : Math.max(1, Math.ceil(preparedProjects.length / pageSize));
  const currentPage = virtualizeList ? 1 : clamp(page, 1, totalPages);
  const pagedProjects = useMemo(() => {
    if (virtualizeList) return preparedProjects;
    const start = (currentPage - 1) * pageSize;
    return preparedProjects.slice(start, start + pageSize);
  }, [preparedProjects, currentPage, pageSize, virtualizeList]);

  useEffect(() => {
    if (!virtualizeList) setPage(1);
  }, [query, activeStatusFilter, activeSortBy, activeSortDir, pageSize, virtualizeList]);

  const [internalTheme, setInternalTheme] = useState(() => {
    if (theme) return theme;
    if (lsKey) return readLS(lsKey("theme"), "system");
    return defaultTheme;
  });
  const activeTheme = theme ?? internalTheme;

  const applyTheme = useCallback((mode) => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
    const isDark = mode === "dark" || (mode === "system" && prefersDark);
    root.classList.toggle("dark", isDark);
  }, []);

  useEffect(() => {
    applyTheme(activeTheme);
    if (lsKey) writeLS(lsKey("theme"), activeTheme);
  }, [activeTheme, applyTheme, lsKey]);

  const toggleTheme = () => {
    if (onToggleTheme) return onToggleTheme();
    const next = activeTheme === "dark" ? "light" : activeTheme === "light" ? "system" : "dark";
    if (theme === undefined) setInternalTheme(next);
    onThemeChange?.(next);
  };

  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState({ id: "", name: "", subtitle: "", date: "", progress: 0, status: "inProgress", accentColor: "#6366f1", participants: [] });
  const [detailProject, setDetailProject] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [liveMsg, setLiveMsg] = useState("");

  const scrollRef = useRef(null);
  const messagesPanelRef = useRef(null);
  const liveRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  const onScroll = useCallback(() => {
    const t = scrollRef.current?.scrollTop ?? 0;
    setScrollTop(t);
  }, []);

  useEffect(() => {
    if (!virtualizeList) return;
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [virtualizeList, onScroll]);

  const viewportH = scrollRef.current?.clientHeight ?? 0;
  const itemH = estimatedRowHeight;
  const overscan = 3;
  const totalCount = pagedProjects.length;
  const startIndex = virtualizeList && viewMode === "list" ? Math.max(0, Math.floor(scrollTop / itemH) - overscan) : 0;
  const endIndex = virtualizeList && viewMode === "list" ? Math.min(totalCount, Math.ceil((scrollTop + viewportH) / itemH) + overscan) : totalCount;
  const before = startIndex * itemH;
  const after = Math.max(0, (totalCount - endIndex) * itemH);
  const visibleProjects = virtualizeList && viewMode === "list" ? pagedProjects.slice(startIndex, endIndex) : pagedProjects;

  const [localStarred, setLocalStarred] = useState({});
  useEffect(() => {
    const seed = {};
    messages.forEach((m) => (seed[m.id] = !!m.starred));
    setLocalStarred(seed);
  }, [messages]);

  const isStarred = (m) => m.starred ?? localStarred[m.id] ?? false;
  const toggleStar = (m) => {
    const next = !isStarred(m);
    if (onMessageStarChange) {
      onMessageStarChange(m.id, next);
    } else {
      setLocalStarred((s) => ({ ...s, [m.id]: next }));
    }
  };

  useEffect(() => { if (lsKey) writeLS(lsKey("view"), viewMode); }, [lsKey, viewMode]);
  useEffect(() => { if (lsKey) writeLS(lsKey("query"), query); }, [lsKey, query]);
  useEffect(() => { if (lsKey) writeLS(lsKey("messagesOpen"), isMessagesOpen); }, [lsKey, isMessagesOpen]);
  useEffect(() => { if (lsKey) { writeLS(lsKey("sortBy"), activeSortBy); writeLS(lsKey("sortDir"), activeSortDir); } }, [lsKey, activeSortBy, activeSortDir]);
  useEffect(() => { if (lsKey) writeLS(lsKey("statusFilter"), activeStatusFilter); }, [lsKey, activeStatusFilter]);
  useEffect(() => { if (lsKey && !virtualizeList) writeLS(lsKey("page"), currentPage); }, [lsKey, currentPage, virtualizeList]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (isMessagesOpen) setMessagesOpen(false);
        if (reorderMode) setReorderMode(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMessagesOpen, reorderMode]);

  const setView = (next) => { if (view === undefined) setInternalView(next); onViewChange?.(next); };
  const setSearch = (q) => { if (searchQuery === undefined) setInternalQuery(q); onSearchQueryChange?.(q); };
  const setMessagesOpen = (open) => { if (messagesOpen === undefined) setInternalMessagesOpen(open); onMessagesOpenChange?.(open); };
  const setSort = (by, dir) => { if (sortBy === undefined) setInternalSortBy(by); if (sortDir === undefined) setInternalSortDir(dir); onSortChange?.(by, dir); };
  const setStatusFilter = (status) => { if (statusFilter === undefined) setInternalStatusFilter(status); onStatusFilterChange?.(status); };
  const goToPage = (p) => { setPage(p); onPageChange?.(p); };

  const startEdit = (p) => { setEditingId(p.id); setEditDraft({ ...p }); };
  const cancelEdit = () => { setEditingId(null); setEditDraft(null); };
  const saveEdit = () => {
    if (!editDraft) return;
    if (onProjectUpdate) { onProjectUpdate(editDraft); } else { setLocalProjects((arr) => arr.map((x) => (x.id === editDraft.id ? editDraft : x))); }
    setEditingId(null); setEditDraft(null);
  };
  const mkId = () => generateId?.() ?? Math.random().toString(36).slice(2, 8) + "-" + Date.now().toString(36).slice(-4);
  const submitCreate = (e) => {
    e.preventDefault();
    const id = mkId();
    const proj = { ...createDraft, id };
    if (onProjectCreate) { onProjectCreate(proj); } else { setLocalProjects((arr) => [proj, ...arr]); }
    setCreateOpen(false);
    setCreateDraft({ id: "", name: "", subtitle: "", date: "", progress: 0, status: "inProgress", accentColor: "#6366f1", participants: [] });
  };
  const openDetail = (p) => { if (onProjectClick) return onProjectClick(p.id); setDetailProject(p); };

  const handleDragStart = (id) => setDragId(id);
  const handleDragOver = (e) => e.preventDefault();
  const doReorder = (ids) => {
    if (onProjectsReorder) { onProjectsReorder(ids); } else {
      setLocalProjects((arr) => {
        const map = new Map(arr.map((p) => [p.id, p]));
        return ids.map((id) => map.get(id)).filter(Boolean);
      });
    }
  };
  const handleDrop = (targetId) => {
    if (!dragId || dragId === targetId) return;
    const ids = preparedProjects.map((p) => p.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    const full = dataProjects.map((p) => p.id);
    const reordered = reorderWithinFull(full, ids);
    doReorder(reordered);
    setDragId(null);
    announce(`Moved item to position ${to + 1}.`);
  };
  function reorderWithinFull(fullIds, visibleIds) {
    const setVisible = new Set(visibleIds);
    const remaining = fullIds.filter((id) => !setVisible.has(id));
    return [...visibleIds, ...remaining];
  }
  const announce = (msg) => { setLiveMsg(""); setTimeout(() => setLiveMsg(msg), 10); };
  const canReorder = activeSortBy === "manual" && !query && activeStatusFilter === "all" && viewMode === "list";

  const moveBy = (id, delta) => {
    const vis = preparedProjects.map((p) => p.id);
    const i = vis.indexOf(id);
    if (i < 0) return;
    const j = clamp(i + delta, 0, vis.length - 1);
    if (i === j) return;
    vis.splice(j, 0, vis.splice(i, 1)[0]);
    const reordered = reorderWithinFull(dataProjects.map((p) => p.id), vis);
    doReorder(reordered);
    announce(`Moved to position ${j + 1}.`);
  };
  const moveToIndex = (id, index) => {
    const vis = preparedProjects.map((p) => p.id);
    const i = vis.indexOf(id);
    const j = clamp(index, 0, vis.length - 1);
    if (i < 0 || i === j) return;
    vis.splice(j, 0, vis.splice(i, 1)[0]);
    const reordered = reorderWithinFull(dataProjects.map((p) => p.id), vis);
    doReorder(reordered);
    announce(`Moved to position ${j + 1}.`);
  };

  const getNavIcon = (id) => {
    switch ((id || "").toLowerCase()) {
      case "home": return <Icons.Home className="size-5" />;
      case "charts": case "analytics": return <Icons.Chart className="size-5" />;
      case "calendar": return <Icons.Calendar className="size-5" />;
      case "settings": case "preferences": return <Icons.Settings className="size-5" />;
      default: return <Icons.Logo className="size-5" />;
    }
  };

  return (
    <div className={cx("pd-container flex flex-col h-full w-full bg-slate-50 dark:bg-slate-900 overflow-hidden", className)}>
      <div aria-live="polite" aria-atomic="true" className="sr-only" ref={liveRef}>{liveMsg}</div>
      <header className={cx("flex items-center justify-between border-b border-slate-200 dark:border-slate-700", spacing.page.header, spacing.gap.sm)}>
        <div className={cx("flex items-center min-w-0", spacing.gap.sm)}>
          <span className="inline-flex size-10 items-center justify-center rounded-lg bg-indigo-600 text-white dark:bg-indigo-500 shrink-0"><Icons.Logo className="size-5" /></span>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">{title}</h1>
          {showSearch && (
            <label htmlFor={searchInputId} className={cx("hidden md:flex items-center rounded-lg bg-white dark:bg-slate-800", "ring-1 ring-slate-200 dark:ring-slate-700 px-3 py-2 ml-4", spacing.gap.xs)}>
              <Icons.Search className="size-4 text-slate-500 dark:text-slate-400" />
              <input id={searchInputId} aria-label="Search projects" className="bg-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none text-sm w-56" placeholder={searchPlaceholder} value={query} onChange={(e) => setSearch(e.target.value)} />
            </label>
          )}
        </div>
        <div className={cx("flex items-center", spacing.gap.xs)}>
          {allowCreate && (
            <button className={cx("rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors", spacing.button.md)} onClick={(e) => { e.preventDefault(); if (onProjectCreate) onProjectCreate(); else setCreateOpen(true); }}>
              <span className="hidden sm:inline">New Project</span><Icons.Plus className="size-5 sm:hidden" />
            </button>
          )}
          {showThemeToggle && (
            <button title={`Theme: ${activeTheme}`} onClick={toggleTheme} className={cx("rounded-lg ring-1 ring-slate-200 dark:ring-slate-700", "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200", "hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors", "p-2")}><Icons.Theme className="size-5" /><span className="sr-only">Toggle theme</span></button>
          )}
          {sidebarLinks.length > 0 && <button className={cx("rounded-lg ring-1 ring-slate-200 dark:ring-slate-700", "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200", "hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors", "p-2")} aria-label="Notifications"><Icons.Bell className="size-5" /></button>}
          {user && (
             <button className={cx("flex items-center rounded-lg ring-1 ring-slate-200 dark:ring-slate-700", "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors", "pl-2 pr-3 py-1.5", spacing.gap.xs)} aria-label="Account menu">
               {user.avatarUrl && <img src={user.avatarUrl} alt="" className="size-8 rounded-md object-cover" />}
               {user.name && <span className="hidden sm:inline text-sm font-medium text-slate-800 dark:text-slate-100">{user.name}</span>}
             </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {sidebarLinks && sidebarLinks.length > 0 && (
          <aside className={cx("hidden sm:flex flex-col items-center border-r border-slate-200 dark:border-slate-700 shrink-0", spacing.page.sidebar, spacing.gap.sm)}>
            {sidebarLinks.map((l) => (
              <a key={l.id} href={l.href || "#"} className={cx("size-11 inline-flex items-center justify-center rounded-lg transition-all", "ring-1 ring-slate-200 dark:ring-slate-700", l.active ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700")} aria-current={l.active ? "page" : undefined} title={l.label}>
                {l.icon ?? getNavIcon(l.id)}<span className="sr-only">{l.label}</span>
              </a>
            ))}
          </aside>
        )}

        <main className={cx("flex-1 min-w-0 overflow-hidden flex flex-col", spacing.page.main)}>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4 mt-2">
            <div className={cx("flex flex-wrap items-center", spacing.gap.md)}>
              {computedStats.map((s, i) => (
                <div key={s.id} className={cx("flex items-center", spacing.gap.xs)}>
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{s.value}</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">{s.label}</span>
                  {i < computedStats.length - 1 && <span className="ml-4 w-px h-8 bg-slate-200 dark:bg-slate-700" />}
                </div>
              ))}
            </div>

            <div className={cx("flex items-center", spacing.gap.xs)}>
              <select id={statusSelectId} value={activeStatusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={cx("rounded-lg ring-1 ring-slate-200 dark:ring-slate-700", "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200", spacing.button.sm)}>
                <option value="all">Todos</option>
                <option value="Triagem">Triagem</option>
                <option value="Sondagem">Sondagem</option>
                <option value="Visita">Visita</option>
                <option value="Fechamento">Fechamento</option>
                <option value="Ghosting">Ghosting</option>
              </select>

              <div className={cx("inline-flex items-center", spacing.gap.xs)}>
                <select id="sortBy" value={activeSortBy} onChange={(e) => setSort(e.target.value, activeSortDir)} className={cx("rounded-lg ring-1 ring-slate-200 dark:ring-slate-700", "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200", spacing.button.sm)}>
                  <option value="manual">Manual</option>
                  <option value="date">Date</option>
                  <option value="name">Name</option>
                  <option value="progress">Progress</option>
                </select>
                {activeSortBy !== "manual" && <button className={cx("p-2 rounded-lg ring-1 ring-slate-200 dark:ring-slate-700", "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors")} onClick={() => setSort(activeSortBy, activeSortDir === "asc" ? "desc" : "asc")}><Icons.Arrow className={cx("size-4", activeSortDir === "asc" && "rotate-180")} /></button>}
              </div>

              <div className="inline-flex rounded-lg ring-1 ring-slate-200 dark:ring-slate-700">
                <button onClick={() => setView("kanban")} className={cx("p-2 rounded-l-lg transition-colors border-r border-slate-200 dark:border-slate-700", viewMode === "kanban" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700")}>Kanban</button>
                <button onClick={() => setView("list")} className={cx("p-2 transition-colors border-r border-slate-200 dark:border-slate-700", viewMode === "list" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700")}><Icons.List className="size-5" /></button>
                <button onClick={() => setView("grid")} className={cx("p-2 rounded-r-lg transition-colors", viewMode === "grid" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700")}><Icons.Grid className="size-5" /></button>
              </div>
            </div>
          </div>

          <section ref={scrollRef} className={cx("flex-1 overflow-y-auto w-full", viewMode === "kanban" ? "flex gap-4 p-4 items-start overflow-x-auto" : viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" : cx("flex flex-col", spacing.gap.sm))} style={virtualizeList && viewMode === "list" ? { position: "relative" } : undefined}>
            {viewMode === "kanban" ? (
              // Kanban Board View
              (kanbanColumns || ["Triagem", "Sondagem", "Visita", "Fechamento", "Ghosting"]).map(col => {
                const columnId = typeof col === 'string' ? col : col.id;
                const columnLabel = typeof col === 'string' ? col : col.label;
                return (
                <div key={columnId} className="flex flex-col gap-3 min-w-[280px] w-[280px] shrink-0 bg-slate-100/50 dark:bg-slate-800/20 p-3 rounded-xl border border-slate-200 dark:border-slate-700 h-full"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const id = e.dataTransfer.getData("projId");
                    if (id && onProjectUpdate) {
                      const p = dataProjects.find(p => p.id === id || p.id === Number(id));
                      if (p && p.status !== columnId) {
                        onProjectUpdate({...p, status: columnId});
                      }
                    }
                  }}
                >
                  <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-200 mb-2">
                     <span>{columnLabel}</span>
                     <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full">{visibleProjects.filter(p => p.status === columnId).length}</span>
                  </div>
                  <div className="flex flex-col gap-3 overflow-y-auto pb-6 h-full">
                    {visibleProjects.filter(p => p.status === columnId).map(p => {
                      const accent = p.accentColor || "#6366f1";
                      return (
                        <article key={p.id} draggable onDragStart={(e) => { e.dataTransfer.setData("projId", p.id); handleDragStart(p.id); }} className={cx("group flex flex-col rounded-xl transition-all cursor-pointer ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-800", spacing.card.compact, "hover:shadow-md hover:ring-slate-300 dark:hover:ring-slate-600")} onClick={() => openDetail(p)}>
                          <div className="flex justify-between items-start w-full">
                            <span className="text-xs text-slate-500 font-bold px-2 py-1 rounded bg-slate-100">{p.date || "Novo"}</span>
                          </div>
                          <div className="mt-3">
                            <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{p.name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-1">{p.subtitle}</p>
                          </div>
                          <div className="mt-4 w-full">
                            <div className="flex items-center justify-between mb-1"><span className="text-xs font-medium text-slate-600">Progress</span><span className="text-xs">{p.progress ?? 0}%</span></div>
                            <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden"><div className="h-1.5 rounded-full" style={{ width: `${Math.min(Math.max(p.progress ?? 0, 0), 100)}%`, backgroundColor: accent }} /></div>
                          </div>
                          <div className="flex flex-wrap items-center justify-between w-full mt-4 gap-2">
                            <span className="text-[10px] px-2 py-1 font-bold rounded-lg shrink-0 text-slate-500 bg-slate-100 border">{p.status}</span>
                            <div className="flex items-center gap-1">
                              <button title="Editar" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" onClick={(e) => { e.stopPropagation(); onProjectAction?.(p.id, "edit"); }}><Icons.Edit className="size-4" /></button>
                              <button title="Deletar" className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" onClick={(e) => { e.stopPropagation(); onProjectAction?.(p.id, "delete"); }}><Icons.Trash className="size-4" /></button>
                              <button title="WhatsApp" className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-white font-bold text-xs bg-green-500 hover:bg-green-600 shadow-sm transition-colors ml-1" onClick={(e) => { e.stopPropagation(); onProjectAction?.(p.id, "whatsapp"); }}><Icons.MessageCircle className="size-3.5" /> WPP</button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              );
            })
            ) : (
              // List / Grid View
              !loading && visibleProjects.map((p) => {
                const accent = p.accentColor || "#6366f1";
                return (
                  <article key={p.id} draggable={canReorder} onDragStart={() => canReorder && handleDragStart(p.id)} onDragOver={canReorder ? handleDragOver : undefined} onDrop={() => canReorder && handleDrop(p.id)} className={cx("group flex flex-col rounded-xl transition-all cursor-pointer ring-1 ring-slate-200 dark:ring-slate-700", p.bgColorClass || "bg-white dark:bg-slate-800", viewMode === "list" ? cx("sm:flex-row items-center", spacing.card.compact, spacing.gap.md) : cx("flex-col", spacing.card.base), "hover:shadow-md hover:ring-slate-300 dark:hover:ring-slate-600")} onClick={() => openDetail(p)}>
                    <div className={cx("flex justify-between items-start", viewMode === "list" ? "w-full min-w-0" : "w-full")}>
                      <span className="text-xs text-slate-500 font-bold px-2 py-1 rounded bg-slate-100">{p.date || "Novo"}</span>
                    </div>
                    <div className={cx(viewMode === "list" ? "flex-1 min-w-0" : "mt-3")}>
                      <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{p.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-1">{p.subtitle}</p>
                    </div>
                    {viewMode === "grid" && (
                       <div className="mt-4 w-full">
                         <div className="flex items-center justify-between mb-1"><span className="text-xs font-medium text-slate-600">Progress</span><span className="text-xs">{p.progress ?? 0}%</span></div>
                         <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden"><div className="h-1.5 rounded-full" style={{ width: `${Math.min(Math.max(p.progress ?? 0, 0), 100)}%`, backgroundColor: accent }} /></div>
                       </div>
                    )}
                    <div className={cx("flex items-center justify-between w-full mt-4", viewMode === "list" ? "!mt-0 max-w-[200px] shrink-0" : "")}>
                      <span className={cx("text-xs px-2 py-1 font-bold rounded-lg shrink-0", "text-slate-600 bg-slate-100")}>{p.status}</span>
                      <div className="flex items-center gap-1">
                        <button title="Editar" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" onClick={(e) => { e.stopPropagation(); onProjectAction?.(p.id, "edit"); }}><Icons.Edit className="size-4" /></button>
                        <button title="Deletar" className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" onClick={(e) => { e.stopPropagation(); onProjectAction?.(p.id, "delete"); }}><Icons.Trash className="size-4" /></button>
                        <button title="WhatsApp" className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-white font-bold text-xs bg-green-500 hover:bg-green-600 shadow-sm transition-colors ml-1" onClick={(e) => { e.stopPropagation(); onProjectAction?.(p.id, "whatsapp"); }}><Icons.MessageCircle className="size-3.5" /> WPP</button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default ProjectDashboard;
