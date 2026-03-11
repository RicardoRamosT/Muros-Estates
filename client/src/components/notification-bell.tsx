import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bell, Trash2, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  section: string;
  targetIds: string[] | null;
  read: boolean | null;
  createdAt: string;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000, // Poll every 30s for new notifications
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PUT", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  const handleClick = (notif: Notification) => {
    if (!notif.read) {
      markReadMutation.mutate(notif.id);
    }
    setOpen(false);
    const path = notif.section === "clientes" ? "/admin/clientes" : "/admin/prospectos";
    const highlight = notif.targetIds?.join(",") || "";
    navigate(`${path}?highlight=${highlight}`);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "ahora";
    if (diffMins < 60) return `hace ${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `hace ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `hace ${diffDays}d`;
  };

  const TypeIcon = ({ type }: { type: string }) => {
    if (type === "duplicate_phone") return <Phone className="w-4 h-4 text-orange-500 flex-shrink-0" />;
    if (type === "duplicate_email") return <Mail className="w-4 h-4 text-orange-500 flex-shrink-0" />;
    return <Bell className="w-4 h-4 text-muted-foreground flex-shrink-0" />;
  };

  const NotifItem = ({ notif, showDelete }: { notif: Notification; showDelete?: boolean }) => (
    <div
      className={cn(
        "flex items-start gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
        !notif.read && "bg-primary/5"
      )}
      onClick={() => handleClick(notif)}
    >
      <TypeIcon type={notif.type} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className={cn("text-xs font-medium", !notif.read && "text-primary")}>
            {notif.title}
          </span>
          <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">
            {formatTime(notif.createdAt)}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">
          {notif.message}
        </p>
        <span className="text-[10px] text-muted-foreground/70 capitalize">
          {notif.section}
        </span>
      </div>
      {showDelete && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            deleteMutation.mutate(notif.id);
          }}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      )}
    </div>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative p-2">
          <Bell className="w-5 h-5" />
          {unread.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {unread.length > 99 ? "99+" : unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b">
          <h4 className="text-sm font-semibold">Notificaciones</h4>
        </div>
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Sin notificaciones
            </div>
          ) : (
            <div className="p-1">
              {unread.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    No leídas ({unread.length})
                  </div>
                  {unread.map((n) => (
                    <NotifItem key={n.id} notif={n} />
                  ))}
                </div>
              )}
              {read.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-1">
                    Leídas
                  </div>
                  {read.map((n) => (
                    <NotifItem key={n.id} notif={n} showDelete />
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
