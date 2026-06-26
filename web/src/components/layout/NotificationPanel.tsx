import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Api } from '@/lib/api';
import { fmtRelativeTime } from '@/lib/format';
import type { NotificationsData } from '@/types';

export function NotificationPanel({
  open,
  onClose,
  onUnreadChange,
}: {
  open: boolean;
  onClose: () => void;
  onUnreadChange: (count: number) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [data, setData] = useState<NotificationsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await Api.get<NotificationsData>('/api/notifications');
      setData(res);
      onUnreadChange(res.unread);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, [onUnreadChange]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open, onClose]);

  async function markRead(id: number) {
    try {
      await Api.post(`/api/notifications/${id}/read`);
      await load();
    } catch {
      /* ignore — list will refresh on next open */
    }
  }

  async function markAllRead() {
    try {
      await Api.post('/api/notifications/read-all');
      await load();
    } catch {
      /* ignore */
    }
  }

  async function onItemClick(item: NotificationsData['items'][number]) {
    if (!item.read_at) await markRead(item.id);
    onClose();
    if (item.link_path) navigate(item.link_path);
  }

  if (!open) return null;

  return (
    <div className="notification-panel" ref={panelRef}>
      <div className="notification-panel-header">
        <strong>Notifications</strong>
        {data && data.unread > 0 ? (
          <button type="button" className="btn-link" onClick={markAllRead}>
            Mark all read
          </button>
        ) : null}
      </div>

      {error ? <div className="notification-panel-error">{error}</div> : null}
      {loading && !data ? <div className="notification-panel-empty">Loading…</div> : null}

      {data && data.items.length === 0 ? (
        <div className="notification-panel-empty">
          <p>You&apos;re all caught up.</p>
          <p className="help-text">Payroll runs and rate verifications appear here.</p>
        </div>
      ) : null}

      {data && data.items.length > 0 ? (
        <ul className="notification-list">
          {data.items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`notification-item${item.read_at ? '' : ' unread'}`}
                onClick={() => onItemClick(item)}
              >
                <span className="notification-item-title">{item.title}</span>
                {item.body ? <span className="notification-item-body">{item.body}</span> : null}
                <span className="notification-item-time">{fmtRelativeTime(item.created_at)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="notification-panel-footer">
        <Link to="/activity" onClick={onClose}>
          View activity log
        </Link>
      </div>
    </div>
  );
}
