import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  FileText,
  ExternalLink,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Eye,
  EyeOff
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";

interface GoogleForm {
  id: string;
  title: string;
  description: string;
  formUrl: string;
  embedUrl?: string;
  visible: boolean;
  category: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const GoogleFormsManager = () => {
  const [forms, setForms] = useState<GoogleForm[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<GoogleForm>>({});
  const queryClient = useQueryClient();

  // Fetch forms from Firebase
  const { data: formsData, isLoading } = useQuery({
    queryKey: ["google-forms"],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, "google_forms"));
      const forms = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as GoogleForm[];
      return forms.sort((a, b) => a.sortOrder - b.sortOrder);
    },
  });

  useEffect(() => {
    if (formsData) {
      setForms(formsData);
    }
  }, [formsData]);

  // Add new form
  const addFormMutation = useMutation({
    mutationFn: async (formData: Omit<GoogleForm, 'id' | 'createdAt' | 'updatedAt'>) => {
      const docRef = await addDoc(collection(db, "google_forms"), {
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-forms"] });
      toast.success("Formulario añadido correctamente");
      setIsEditing(null);
      setEditForm({});
    },
    onError: (error) => {
      toast.error("Error al añadir formulario: " + error.message);
    },
  });

  // Update form
  const updateFormMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<GoogleForm> }) => {
      await updateDoc(doc(db, "google_forms", id), {
        ...updates,
        updatedAt: new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-forms"] });
      toast.success("Formulario actualizado");
      setIsEditing(null);
      setEditForm({});
    },
    onError: (error) => {
      toast.error("Error al actualizar formulario: " + error.message);
    },
  });

  // Delete form
  const deleteFormMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, "google_forms", id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-forms"] });
      toast.success("Formulario eliminado");
    },
    onError: (error) => {
      toast.error("Error al eliminar formulario: " + error.message);
    },
  });

  const handleAddForm = () => {
    setIsEditing('new');
    setEditForm({
      title: '',
      description: '',
      formUrl: '',
      embedUrl: '',
      visible: true,
      category: 'general',
      sortOrder: forms.length,
    });
  };

  const handleEditForm = (form: GoogleForm) => {
    setIsEditing(form.id);
    setEditForm({ ...form });
  };

  const handleSaveForm = () => {
    if (!editForm.title || !editForm.formUrl) {
      toast.error("Título y URL del formulario son obligatorios");
      return;
    }

    if (isEditing === 'new') {
      addFormMutation.mutate(editForm as Omit<GoogleForm, 'id' | 'createdAt' | 'updatedAt'>);
    } else {
      updateFormMutation.mutate({
        id: isEditing,
        updates: editForm
      });
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(null);
    setEditForm({});
  };

  const handleDeleteForm = (id: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este formulario?")) {
      deleteFormMutation.mutate(id);
    }
  };

  const toggleVisibility = (form: GoogleForm) => {
    updateFormMutation.mutate({
      id: form.id,
      updates: { visible: !form.visible }
    });
  };

  const extractEmbedUrl = (formUrl: string): string => {
    // Convert Google Forms URL to embed URL
    const match = formUrl.match(/\/forms\/d\/([^\/]+)/);
    if (match) {
      return `https://docs.google.com/forms/d/${match[1]}/viewform?embedded=true`;
    }
    return formUrl;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-sand-dark/20 border-t-sand-dark rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Google Forms Manager</h2>
          <p className="text-sm text-muted-foreground">
            Gestiona formularios de Google Forms para encuestas, feedback y más
          </p>
        </div>
        <Button onClick={handleAddForm} className="flex items-center gap-2">
          <Plus size={16} />
          Añadir Formulario
        </Button>
      </div>

      {/* Add/Edit Form */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText size={20} />
              {isEditing === 'new' ? 'Nuevo Formulario' : 'Editar Formulario'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Título del formulario"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <select
                  id="category"
                  value={editForm.category || 'general'}
                  onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="general">General</option>
                  <option value="feedback">Feedback</option>
                  <option value="survey">Encuesta</option>
                  <option value="contact">Contacto</option>
                  <option value="booking">Reserva</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={editForm.description || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción opcional del formulario"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="formUrl">URL del Formulario *</Label>
              <Input
                id="formUrl"
                value={editForm.formUrl || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, formUrl: e.target.value }))}
                placeholder="https://docs.google.com/forms/d/..."
              />
              <p className="text-xs text-muted-foreground">
                Pega la URL completa del formulario de Google Forms
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="embedUrl">URL de Embed (opcional)</Label>
              <Input
                id="embedUrl"
                value={editForm.embedUrl || extractEmbedUrl(editForm.formUrl || '')}
                onChange={(e) => setEditForm(prev => ({ ...prev, embedUrl: e.target.value }))}
                placeholder="URL para embed automático"
              />
              <p className="text-xs text-muted-foreground">
                Si está vacío, se generará automáticamente desde la URL del formulario
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="visible"
                checked={editForm.visible ?? true}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, visible: checked }))}
              />
              <Label htmlFor="visible">Visible en la web</Label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveForm} disabled={addFormMutation.isPending || updateFormMutation.isPending}>
                <Save size={16} className="mr-2" />
                {addFormMutation.isPending || updateFormMutation.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
              <Button variant="outline" onClick={handleCancelEdit}>
                <X size={16} className="mr-2" />
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Forms List */}
      <div className="grid gap-4">
        {forms.map((form) => (
          <Card key={form.id} className={!form.visible ? 'opacity-60' : ''}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-foreground">{form.title}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {form.category}
                    </Badge>
                    {!form.visible && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Oculto
                      </Badge>
                    )}
                  </div>
                  {form.description && (
                    <p className="text-sm text-muted-foreground mb-3">{form.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Creado: {form.createdAt?.toLocaleDateString('es-ES')}</span>
                    {form.updatedAt && (
                      <span>Actualizado: {form.updatedAt.toLocaleDateString('es-ES')}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleVisibility(form)}
                    title={form.visible ? "Ocultar formulario" : "Mostrar formulario"}
                  >
                    {form.visible ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(form.formUrl, '_blank')}
                    title="Abrir formulario"
                  >
                    <ExternalLink size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditForm(form)}
                    title="Editar formulario"
                  >
                    <Edit size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteForm(form.id)}
                    title="Eliminar formulario"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {forms.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText size={48} className="mx-auto mb-4 opacity-50" />
            <p>No hay formularios configurados aún</p>
            <p className="text-sm">Haz clic en "Añadir Formulario" para empezar</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleFormsManager;