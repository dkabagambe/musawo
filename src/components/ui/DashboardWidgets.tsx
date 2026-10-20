"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Component,
  createContext,
  Suspense,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  CalendarDays,
  Check,
  ChevronRight,
  ExternalLink,
  GripVertical,
  Mail,
  Phone,
  Clock3,
  SlidersHorizontal,
  X,
  Users,
} from "lucide-react";
import type {
  DashboardTab,
  DashboardWidgetDefinition,
} from "@/lib/dashboard/widgets";
import { balanceDashboardColumns } from "@/lib/dashboard/format";

export interface DashboardTabItem {
  id: DashboardTab;
  label: string;
}

export function TabBar({ tabs }: { tabs: DashboardTabItem[] }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const current = params.get("tab") ?? tabs[0]?.id;
  useEffect(() => {
    if (params.has("tab") || !tabs[0]) return;
    const next = new URLSearchParams(params.toString());
    next.set("tab", tabs[0].id);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [params, pathname, router, tabs]);
  const select = (tab: DashboardTab) => {
    const next = new URLSearchParams(params.toString());
    next.set("tab", tab);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };
  return (
    <div
      className="portal-tabbar"
      role="tablist"
      aria-label="Dashboard sections"
    >
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={current === tab.id}
          tabIndex={current === tab.id ? 0 : -1}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            const nextIndex =
              (index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) %
              tabs.length;
            const next =
              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                "[role='tab']",
              )[nextIndex];
            next?.focus();
            next?.click();
          }}
          className={`portal-tab ${current === tab.id ? "is-active" : ""}`}
          onClick={() => select(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function DashboardPageHeader({
  firstName,
  tabs,
  customizer,
}: {
  firstName: string;
  tabs: DashboardTabItem[];
  customizer?: React.ReactNode;
}) {
  return (
    <header className="dashboard-page-header">
      <h1>
        Hello {firstName}! <span aria-hidden="true">👋</span>
      </h1>
      <TabBar tabs={tabs} />
      {customizer}
    </header>
  );
}

export function WidgetGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-widget-grid dashboard-widget-masonry">
      {children}
    </div>
  );
}

export function WidgetSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div
      className="dashboard-widget-skeleton"
      aria-label="Loading widget"
      role="status"
    >
      <span className="sr-only">Loading widget</span>
      {Array.from({ length: rows }, (_, index) => (
        <i key={index} />
      ))}
    </div>
  );
}

export class DashboardWidgetErrorBoundary extends Component<
  { children: React.ReactNode },
  { failed: boolean; resetKey: number }
> {
  state = { failed: false, resetKey: 0 };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  retry = () =>
    this.setState((state) => ({ failed: false, resetKey: state.resetKey + 1 }));
  render() {
    if (this.state.failed)
      return (
        <div className="dashboard-widget-error" role="alert">
          <p>This widget could not load.</p>
          <button type="button" onClick={this.retry}>
            Try again
          </button>
        </div>
      );
    return <div key={this.state.resetKey}>{this.props.children}</div>;
  }
}

export function Widget({
  title,
  aside,
  href,
  children,
  footer,
  className = "",
}: {
  title: string;
  aside?: string;
  href?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`dashboard-widget dashboard-widget-enter ${className}`}>
      <header className="dashboard-widget-header">
        <h2>
          {title}
          {aside && <span>{aside}</span>}
        </h2>
        {href && (
          <Link
            href={href}
            className="dashboard-widget-open"
            aria-label={`Open ${title}`}
            title={`Open ${title}`}
          >
            <ExternalLink size={24} />
          </Link>
        )}
      </header>
      <div className="dashboard-widget-content">
        <DashboardWidgetErrorBoundary>
          <Suspense fallback={<WidgetSkeleton rows={2} />}>{children}</Suspense>
        </DashboardWidgetErrorBoundary>
      </div>
      {footer && <footer className="dashboard-widget-footer">{footer}</footer>}
    </section>
  );
}

export function ListRow({
  href,
  children,
  date,
  icon,
}: {
  href: string;
  children: React.ReactNode;
  date?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link href={href} className="dashboard-list-row">
      <span className="dashboard-list-leading">{icon}</span>
      <span className="dashboard-list-label">{children}</span>
      {date && <time className="dashboard-list-date">{date}</time>}
      <ChevronRight size={16} />
    </Link>
  );
}

export function MiniCard({
  title,
  subtitle,
  href,
  actionLabel = "Open",
  subtitleIcon,
  status,
  children,
}: {
  title: string;
  subtitle?: string;
  href: string;
  actionLabel?: string;
  subtitleIcon?: React.ReactNode;
  status?: { label: string; tone: "today" | "soon" | "live" };
  children?: React.ReactNode;
}) {
  return (
    <article className="dashboard-mini-card">
      {status && (
        <span className={`dashboard-class-status status-${status.tone}`}>
          {status.label}
        </span>
      )}
      <h3 title={title}>{title}</h3>
      {subtitle && (
        <p className="dashboard-meta-line">
          {subtitleIcon}
          {subtitle}
        </p>
      )}
      {children}
      <Link href={href} className="dashboard-mini-open">
        {actionLabel}
      </Link>
    </article>
  );
}

export function CalendarMeta({
  children,
  timeZone,
}: {
  children: React.ReactNode;
  timeZone?: string;
}) {
  return (
    <p className="dashboard-meta-line" title={timeZone}>
      <CalendarDays size={16} aria-hidden="true" />
      {children}
    </p>
  );
}

export function ClockMeta({
  children,
  timeZone,
}: {
  children: React.ReactNode;
  timeZone?: string;
}) {
  return (
    <p className="dashboard-meta-line" title={timeZone}>
      <Clock3 size={16} aria-hidden="true" />
      {children}
    </p>
  );
}

export function UsersMeta({ children }: { children: React.ReactNode }) {
  return (
    <p className="dashboard-meta-line">
      <Users size={16} aria-hidden="true" />
      {children}
    </p>
  );
}

export function ProfileCard({
  name,
  id,
  phone,
  email,
  href,
  status = "Active",
}: {
  name: string;
  id?: string;
  phone?: string;
  email?: string;
  href: string;
  status?: "Active" | "Completed" | "On hold";
}) {
  const nameParts = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    nameParts.length > 1
      ? `${nameParts[0][0]}${nameParts.at(-1)?.[0]}`.toUpperCase()
      : (nameParts[0]?.slice(0, 2) ?? "?").toUpperCase();
  const avatarTone =
    Array.from(name.toLowerCase()).reduce(
      (total, character) => total + character.charCodeAt(0),
      0,
    ) % 4;
  return (
    <article className="dashboard-profile-card">
      <span
        className={`dashboard-profile-avatar avatar-tone-${avatarTone}`}
        aria-hidden="true"
      >
        {initials}
      </span>
      <span
        className={`dashboard-status-pill status-${status.toLowerCase().replace(" ", "-")}`}
      >
        {status}
      </span>
      <div className="dashboard-profile-copy">
        <strong>{name}</strong>
        {id && <span>{id}</span>}
        {phone && (
          <a href={`tel:${phone}`}>
            <Phone size={13} aria-hidden="true" />
            {phone}
          </a>
        )}
        {email && (
          <a href={`mailto:${email}`}>
            <Mail size={13} aria-hidden="true" />
            {email}
          </a>
        )}
      </div>
      <Link href={href} className="dashboard-mini-open">
        Message
      </Link>
    </article>
  );
}

export function ViewMoreLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="dashboard-view-more">
      {children}
      <ChevronRight size={15} />
    </Link>
  );
}

export function DashboardTabWidgets({
  tab,
  links,
}: {
  tab: DashboardTab;
  links: Array<{ href: string; label: string }>;
}) {
  const [items, setItems] = useState<EditableWidget[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    fetch(`/api/dashboard/widgets?tab=${encodeURIComponent(tab)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { widgets: EditableWidget[] }) => {
        if (active) setItems(data.widgets);
      })
      .catch(() => {
        if (active) setItems([]);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [tab]);
  if (!loaded) return <WidgetSkeleton rows={3} />;
  const linkByHref = new Map(links.map((link) => [link.href, link]));
  const mapped = items
    .filter((item) => item.visible)
    .map((item, index) => ({
      item,
      link:
        (item.fullPageHref ? linkByHref.get(item.fullPageHref) : undefined) ??
        links[index % Math.max(links.length, 1)],
    }))
    .filter(
      (
        entry,
      ): entry is {
        item: EditableWidget;
        link: { href: string; label: string };
      } => Boolean(entry.link),
    )
    .sort((a, b) => a.item.position - b.item.position);
  const makeWidget = ({ item, link }: (typeof mapped)[number]) => (
    <Widget
      key={item.id}
      title={item.title}
      href={link.href}
      className="dashboard-widget-enter"
    >
      <ListRow href={link.href}>{link.label}</ListRow>
    </Widget>
  );
  const balancedItems = mapped.map((entry) => ({
    ...entry,
    column: entry.item.column,
    columnPinned: entry.item.columnPinned,
  }));
  const [leftItems, rightItems] = balanceDashboardColumns(
    balancedItems,
    ({ item }) => 148 + Math.max(0, item.title.length - 24) * 0.5,
  );
  const left = leftItems.map(({ item, link }) => makeWidget({ item, link }));
  const right = rightItems.map(({ item, link }) => makeWidget({ item, link }));
  if (!mapped.length && links.length)
    return (
      <WidgetGrid>
        {links.map((link) => (
          <Widget
            key={link.href}
            title={link.label}
            href={link.href}
            className="dashboard-widget-enter"
          >
            <ListRow href={link.href}>{link.label}</ListRow>
          </Widget>
        ))}
      </WidgetGrid>
    );
  if (!mapped.length)
    return (
      <div className="dashboard-tab-empty">
        <p>There are no dashboard widgets for this section yet.</p>
      </div>
    );
  return (
    <div className="dashboard-widget-grid dashboard-widget-masonry">
      <div className="dashboard-widget-column">{left}</div>
      <div className="dashboard-widget-column">{right}</div>
    </div>
  );
}

interface EditableWidget extends DashboardWidgetDefinition {
  visible: boolean;
  column: number;
  columnPinned?: boolean;
  position: number;
}

interface DashboardPreferenceState {
  preferences: Map<string, EditableWidget>;
  loaded: boolean;
  update: (widgets: EditableWidget[]) => void;
}

const DashboardPreferenceContext = createContext<DashboardPreferenceState>({
  preferences: new Map(),
  loaded: false,
  update: () => undefined,
});

export function DashboardPreferenceProvider({
  tab,
  children,
}: {
  tab: DashboardTab;
  children: React.ReactNode;
}) {
  const [widgets, setWidgets] = useState<EditableWidget[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    setLoaded(false);
    fetch(`/api/dashboard/widgets?tab=${encodeURIComponent(tab)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { widgets: EditableWidget[] }) => {
        if (active) setWidgets(data.widgets);
      })
      .catch(() => {
        if (active) setWidgets([]);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [tab]);
  const value = useMemo(
    () => ({
      preferences: new Map(widgets.map((widget) => [widget.id, widget])),
      loaded,
      update: (next: EditableWidget[]) => setWidgets(next),
    }),
    [widgets, loaded],
  );
  return (
    <DashboardPreferenceContext.Provider value={value}>
      {children}
    </DashboardPreferenceContext.Provider>
  );
}

export function DashboardWidgetVisibility({
  id,
  tab,
  children,
}: {
  id: string;
  tab: DashboardTab;
  children: React.ReactNode;
}) {
  const preferences = useContext(DashboardPreferenceContext);
  const preference = preferences.preferences.get(id);
  if (preferences.loaded && (!preference || !preference.visible)) return null;
  return (
    <div data-dashboard-widget={id} data-dashboard-tab={tab}>
      {children}
    </div>
  );
}

function SortableWidgetRow({
  item,
  index,
  saving,
  onMove,
  onMoveColumn,
  onToggle,
}: {
  item: EditableWidget;
  index: number;
  saving: boolean;
  onMove: (index: number, direction: -1 | 1) => void;
  onMoveColumn: (index: number) => void;
  onToggle: (index: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 20 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`dashboard-customizer-row ${isDragging ? "is-dragging" : ""}`}
    >
      <button
        type="button"
        className="portal-icon-button dashboard-drag-handle"
        aria-label={`Drag ${item.title}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={18} aria-hidden="true" />
      </button>
      <span className="dashboard-customizer-title">
        {item.title}
        <small>Column {item.column + 1}</small>
      </span>
      <button
        type="button"
        className="portal-icon-button"
        disabled={saving}
        onClick={() => onMove(index, -1)}
        aria-label={`Move ${item.title} up`}
      >
        <ArrowUp size={16} />
      </button>
      <button
        type="button"
        className="portal-icon-button"
        disabled={saving}
        onClick={() => onMove(index, 1)}
        aria-label={`Move ${item.title} down`}
      >
        <ArrowDown size={16} />
      </button>
      <button
        type="button"
        className="portal-icon-button dashboard-column-move"
        disabled={saving}
        onClick={() => onMoveColumn(index)}
        aria-label={`Move ${item.title} to column ${item.column === 0 ? 2 : 1}`}
      >
        <ArrowLeftRight size={16} />
      </button>
      <button
        type="button"
        disabled={saving}
        className={`dashboard-switch ${item.visible ? "is-on" : ""}`}
        role="switch"
        aria-checked={item.visible}
        aria-label={`${item.visible ? "Hide" : "Show"} ${item.title}`}
        onClick={() => onToggle(index)}
      >
        <span />
      </button>
    </div>
  );
}

export function WidgetCustomizer({
  tab,
  onSave,
}: {
  tab: DashboardTab;
  onSave?: (widgets: EditableWidget[]) => void;
}) {
  const preferenceContext = useContext(DashboardPreferenceContext);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<EditableWidget[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(items, oldIndex, newIndex);
    void save(next.map((entry, position) => ({ ...entry, position })));
  };

  useEffect(() => {
    if (!open) return;
    let active = true;
    fetch(`/api/dashboard/widgets?tab=${encodeURIComponent(tab)}`)
      .then((response) => {
        if (!response.ok)
          throw new Error("Could not load your widget settings.");
        return response.json();
      })
      .then((data: { widgets: EditableWidget[] }) => {
        if (active) setItems(data.widgets);
      })
      .catch(() => {
        if (active) {
          setItems([]);
          setError(
            "Widget settings could not be loaded. Try again when your connection is available.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [open, tab]);

  const save = async (next: EditableWidget[]) => {
    setSaving(true);
    setError("");
    setItems(next);
    try {
      const response = await fetch("/api/dashboard/widgets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tab, widgets: next }),
      });
      if (!response.ok)
        throw new Error("Your widget settings could not be saved.");
      setItems(next);
      preferenceContext.update(next);
      onSave?.(next);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Your widget settings could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const next = [...items];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    void save(next.map((item, position) => ({ ...item, position })));
  };

  const moveColumn = (index: number) => {
    const next = items.map((item, current) =>
      current === index
        ? {
            ...item,
            column: item.column === 0 ? 1 : 0,
            columnPinned: true,
          }
        : item,
    );
    void save(next);
  };

  const toggle = (index: number) => {
    const next = items.map((item, current) =>
      current === index ? { ...item, visible: !item.visible } : item,
    );
    void save(next);
  };

  const reset = () =>
    void save(
      items.map((item, position) => ({
        ...item,
        visible: item.defaultVisible ?? true,
        column: item.defaultColumn,
        columnPinned: false,
        position,
      })),
    );

  return (
    <>
      <button
        type="button"
        className="dashboard-edit-widgets"
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal size={16} />
        <span>Edit My Widgets</span>
      </button>
      {open && (
        <div
          className="dashboard-customizer-scrim"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            className="dashboard-customizer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="widget-customizer-title"
          >
            <header>
              <div>
                <h2 id="widget-customizer-title">Edit My Widgets</h2>
                <p>Choose what appears on this dashboard tab.</p>
              </div>
              <button
                type="button"
                className="portal-icon-button"
                onClick={() => setOpen(false)}
                aria-label="Close widget settings"
              >
                <X size={19} />
              </button>
            </header>
            <div className="dashboard-customizer-list">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={items.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {items.map((item, index) => (
                    <SortableWidgetRow
                      key={item.id}
                      item={item}
                      index={index}
                      saving={saving}
                      onMove={move}
                      onMoveColumn={moveColumn}
                      onToggle={toggle}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              {!items.length && (
                <p className="dashboard-customizer-empty">
                  No additional widgets are available for this tab.
                </p>
              )}
            </div>
            {error && (
              <p role="status" className="dashboard-customizer-error">
                {error}
              </p>
            )}
            <footer>
              <button
                type="button"
                className="dashboard-reset-button"
                onClick={reset}
                disabled={saving}
              >
                Reset to default
              </button>
              <button
                type="button"
                className="dashboard-save-button"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                {saving ? (
                  "Saving..."
                ) : (
                  <>
                    <Check size={16} /> Done
                  </>
                )}
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
