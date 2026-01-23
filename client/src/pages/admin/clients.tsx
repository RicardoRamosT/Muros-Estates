import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Client } from "@shared/schema";
import { 
  Users, 
  Search, 
  Phone, 
  Mail, 
  Calendar, 
  Building2, 
  MessageSquare,
  Eye,
  Edit,
  Loader2,
  User,
  Globe,
  Pencil,
  UserCheck,
  ArrowRightLeft
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "nuevo", label: "Nuevo", color: "bg-blue-500" },
  { value: "contactado", label: "Contactado", color: "bg-yellow-500" },
  { value: "interesado", label: "Interesado", color: "bg-green-500" },
  { value: "cita_agendada", label: "Cita Agendada", color: "bg-purple-500" },
  { value: "cerrado", label: "Cerrado", color: "bg-gray-500" },
  { value: "no_interesado", label: "No Interesado", color: "bg-red-500" },
];

export default function AdminClients() {
  const [location] = useLocation();
  const isClientView = location.toLowerCase().includes("/clientes");
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ status: "", notes: "" });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: allRecords = [], isLoading } = useQuery<(Client & { isClient?: boolean })[]>({
    queryKey: ["/api/clients"],
  });
  
  // Filter based on view type
  const clients = allRecords.filter(c => isClientView ? c.isClient === true : c.isClient !== true);

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Client & { isClient?: boolean; convertedAt?: string }> }) => {
      const res = await apiRequest("PUT", `/api/clients/${id}`, data);
      if (!res.ok) throw new Error("Error al actualizar");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: isClientView ? "Cliente actualizado" : "Prospecto actualizado" });
      setIsEditOpen(false);
    },
    onError: () => {
      toast({ title: "Error al actualizar", variant: "destructive" });
    },
  });

  const convertToClient = (client: Client) => {
    updateMutation.mutate({ 
      id: client.id, 
      data: { isClient: true, convertedAt: new Date().toISOString() } as any
    });
    toast({ title: "Prospecto convertido a cliente" });
  };

  const revertToProspect = (client: Client) => {
    updateMutation.mutate({ 
      id: client.id, 
      data: { isClient: false, convertedAt: undefined } as any
    });
    toast({ title: "Cliente revertido a prospecto" });
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm) ||
      client.developmentInterest?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const option = STATUS_OPTIONS.find(s => s.value === status);
    return (
      <Badge className={`${option?.color || "bg-gray-500"} text-white`}>
        {option?.label || status}
      </Badge>
    );
  };

  const openDetail = (client: Client) => {
    setSelectedClient(client);
    setIsDetailOpen(true);
  };

  const openEdit = (client: Client) => {
    setSelectedClient(client);
    setEditForm({ status: client.status, notes: client.notes || "" });
    setIsEditOpen(true);
  };

  const handleSaveEdit = () => {
    if (selectedClient) {
      updateMutation.mutate({ 
        id: selectedClient.id, 
        data: { status: editForm.status, notes: editForm.notes } 
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
              {isClientView ? <UserCheck className="w-7 h-7" /> : <Users className="w-7 h-7" />}
              {isClientView ? "Clientes" : "Prospectos"}
            </h1>
            <p className="text-muted-foreground">
              {isClientView 
                ? "Clientes confirmados que han realizado compras" 
                : "Gestiona los contactos y leads potenciales"
              }
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-1">
            {clients.length} {isClientView ? "clientes" : "prospectos"}
          </Badge>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, email, teléfono o desarrollo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {STATUS_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-20">
            {isClientView ? <UserCheck className="w-16 h-16 text-muted-foreground mx-auto mb-4" /> : <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />}
            <h3 className="text-xl font-semibold mb-2">No hay {isClientView ? "clientes" : "prospectos"}</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== "all" 
                ? `No se encontraron ${isClientView ? "clientes" : "prospectos"} con esos filtros`
                : isClientView 
                  ? "Los clientes aparecerán aquí cuando conviertas prospectos"
                  : "Los prospectos aparecerán aquí cuando envíen el formulario de contacto"
              }
            </p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">{isClientView ? "Cliente" : "Prospecto"}</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Contacto</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Desarrollo</th>
                    <th className="text-left px-4 py-3 font-medium">Estado</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Fecha</th>
                    <th className="text-center px-4 py-3 font-medium w-32">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client, index) => (
                    <tr
                      key={client.id}
                      className="border-t hover:bg-muted/50 transition-colors"
                      data-testid={`row-client-${index}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{client.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              {client.source === "web" ? (
                                <><Globe className="w-3 h-3" /> Formulario web</>
                              ) : (
                                <><Pencil className="w-3 h-3" /> Registro manual</>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="space-y-1">
                          <p className="flex items-center gap-1 text-sm">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            {client.phone}
                          </p>
                          {client.email && (
                            <p className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              {client.email}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {client.developmentInterest ? (
                          <div className="flex items-center gap-1">
                            <Building2 className="w-4 h-4 text-primary shrink-0" />
                            <span className="truncate max-w-48">{client.developmentInterest}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(client.status)}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {formatDate(client.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDetail(client)}
                            title="Ver detalles"
                            data-testid={`button-view-${client.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(client)}
                            title="Editar"
                            data-testid={`button-edit-${client.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {!isClientView ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => convertToClient(client)}
                              title="Convertir a cliente"
                              data-testid={`button-convert-${client.id}`}
                              className="text-green-600 hover:text-green-700"
                            >
                              <UserCheck className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => revertToProspect(client)}
                              title="Revertir a prospecto"
                              data-testid={`button-revert-${client.id}`}
                              className="text-orange-600 hover:text-orange-700"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Detalles del {isClientView ? "Cliente" : "Prospecto"}
            </DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Nombre</Label>
                  <p className="font-medium">{selectedClient.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Estado</Label>
                  <div className="mt-1">{getStatusBadge(selectedClient.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Teléfono</Label>
                  <p className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {selectedClient.phone}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Email</Label>
                  <p className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {selectedClient.email || "No proporcionado"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Origen</Label>
                  <p className="flex items-center gap-1">
                    {selectedClient.source === "web" ? (
                      <><Globe className="w-3 h-3" /> Formulario web</>
                    ) : (
                      <><Pencil className="w-3 h-3" /> Registro manual</>
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Fecha de registro</Label>
                  <p className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(selectedClient.createdAt)}
                  </p>
                </div>
              </div>

              {selectedClient.developmentInterest && (
                <div>
                  <Label className="text-muted-foreground text-xs">Desarrollo de interés</Label>
                  <div className="flex items-center gap-2 mt-1 p-3 bg-primary/5 rounded-lg">
                    <Building2 className="w-5 h-5 text-primary" />
                    <span className="font-medium">{selectedClient.developmentInterest}</span>
                  </div>
                </div>
              )}

              {selectedClient.interest && (
                <div>
                  <Label className="text-muted-foreground text-xs">Mensaje</Label>
                  <div className="flex items-start gap-2 mt-1 p-3 bg-muted rounded-lg">
                    <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <p className="text-sm">{selectedClient.interest}</p>
                  </div>
                </div>
              )}

              {selectedClient.notes && (
                <div>
                  <Label className="text-muted-foreground text-xs">Notas internas</Label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-lg">{selectedClient.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={() => { setIsDetailOpen(false); openEdit(selectedClient!); }}>
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Actualiza el estado y notas del cliente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Estado</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm(f => ({ ...f, status: v }))}>
                <SelectTrigger data-testid="select-edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notas internas</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Agregar notas sobre este cliente..."
                rows={4}
                data-testid="input-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
