import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { adminHeaders, parseAdminApiError, validateClassTypeForm } from "@/lib/admin-api";
import { FormErrorSummary } from "@/components/admin/field-error";

export interface ClassType {
  id: string;
  name: string;
  description: string;
  price: string;
  duration: number;
  imageUrl: string | null;
}

type ClassTypeForm = {
  name: string;
  description: string;
  price: string;
  duration: string;
  imageUrl: string;
};

function classTypeToForm(ct: ClassType): ClassTypeForm {
  return {
    name: ct.name,
    description: ct.description,
    price: String(ct.price),
    duration: String(ct.duration),
    imageUrl: ct.imageUrl ?? "",
  };
}

function ClassTypeFormFields({
  form,
  setForm,
  errors,
}: {
  form: ClassTypeForm;
  setForm: React.Dispatch<React.SetStateAction<ClassTypeForm>>;
  errors: Record<string, string>;
}) {
  return (
    <>
      <FormErrorSummary errors={errors} />
      <div>
        <Label>
          Name <span className="text-red-500">*</span>
        </Label>
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Hatha Yoga"
          className={errors.name ? "border-red-500" : ""}
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
      </div>
      <div>
        <Label>
          Description <span className="text-red-500">*</span>
        </Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Brief description..."
          rows={3}
          className={errors.description ? "border-red-500" : ""}
        />
        {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>
            Price (INR) <span className="text-red-500">*</span>
          </Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            className={errors.price ? "border-red-500" : ""}
          />
          {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
        </div>
        <div>
          <Label>
            Duration (minutes) <span className="text-red-500">*</span>
          </Label>
          <Input
            type="number"
            min="1"
            value={form.duration}
            onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
            className={errors.duration ? "border-red-500" : ""}
          />
          {errors.duration && <p className="text-xs text-red-500 mt-1">{errors.duration}</p>}
        </div>
      </div>
      <div>
        <Label>Image URL (optional)</Label>
        <Input
          value={form.imageUrl}
          onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
          placeholder="https://..."
        />
      </div>
    </>
  );
}

function CreateClassTypeButton({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ClassTypeForm>({
    name: "",
    description: "",
    price: "",
    duration: "60",
    imageUrl: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (payload: ReturnType<typeof validateClassTypeForm>["data"]) => {
      const res = await fetch("/api/class-types", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw Object.assign(new Error(err.message), { fieldErrors: err.fieldErrors });
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Session type created", description: `${form.name} added.` });
      setForm({ name: "", description: "", price: "", duration: "60", imageUrl: "" });
      setErrors({});
      setOpen(false);
      onCreated();
    },
    onError: (e: Error & { fieldErrors?: Record<string, string> }) => {
      if (e.fieldErrors) setErrors(e.fieldErrors);
      toast({ title: "Could not create", description: e.message, variant: "destructive" });
    },
  });

  function submit() {
    const v = validateClassTypeForm(form);
    if (!v.ok) {
      setErrors(v.errors);
      return;
    }
    setErrors({});
    mutation.mutate(v.data);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-[#3d1b80] hover:bg-[#2d1260] text-white">
          <Plus className="w-4 h-4 mr-2" /> New Session Type
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Session Type</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-4 mt-2"
        >
          <ClassTypeFormFields form={form} setForm={setForm} errors={errors} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-[#3d1b80] text-white">
              {mutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditClassTypeDialog({
  classType,
  onUpdated,
}: {
  classType: ClassType;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ClassTypeForm>(() => classTypeToForm(classType));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (payload: ReturnType<typeof validateClassTypeForm>["data"]) => {
      const res = await fetch(`/api/class-types/${classType.id}`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw Object.assign(new Error(err.message), { fieldErrors: err.fieldErrors });
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Session type updated" });
      setOpen(false);
      onUpdated();
    },
    onError: (e: Error & { fieldErrors?: Record<string, string> }) => {
      if (e.fieldErrors) setErrors(e.fieldErrors);
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    },
  });

  function submit() {
    const v = validateClassTypeForm(form);
    if (!v.ok) {
      setErrors(v.errors);
      return;
    }
    setErrors({});
    mutation.mutate(v.data);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setForm(classTypeToForm(classType));
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil className="w-4 h-4 mr-1" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Session Type</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-4 mt-2"
        >
          <ClassTypeFormFields form={form} setForm={setForm} errors={errors} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-[#3d1b80] text-white">
              {mutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteClassTypeButton({
  classType,
  onDeleted,
}: {
  classType: ClassType;
  onDeleted: () => void;
}) {
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/class-types/${classType.id}`, {
        method: "DELETE",
        headers: adminHeaders(),
      });
      if (!res.ok) {
        const err = await parseAdminApiError(res);
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Session type deleted" });
      onDeleted();
    },
    onError: (e: Error) => {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    },
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
          <Trash2 className="w-4 h-4 mr-1" /> Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {classType.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the session type from the and We Teach catalogue. You cannot delete a type
            that still has scheduled sessions.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function SessionTypesPanel({
  classTypes,
  isLoading,
  onDataChange,
}: {
  classTypes: ClassType[];
  isLoading: boolean;
  onDataChange: () => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <p className="text-sm text-muted-foreground">
          Yoga disciplines shown on the public site ({classTypes.length} total)
        </p>
        <CreateClassTypeButton onCreated={onDataChange} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3d1b80]" />
        </div>
      ) : classTypes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No session types yet</p>
          <p className="text-sm mt-1">Create types before scheduling sessions.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classTypes.map((ct) => (
            <div key={ct.id} className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-3">
                {ct.imageUrl && (
                  <img
                    src={ct.imageUrl}
                    alt={ct.name}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{ct.name}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{ct.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-[#3d1b80] border-[#3d1b80]">
                      Rs.{ct.price}
                    </Badge>
                    <Badge variant="outline" className="text-gray-600">
                      {ct.duration} min
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <EditClassTypeDialog classType={ct} onUpdated={onDataChange} />
                    <DeleteClassTypeButton classType={ct} onDeleted={onDataChange} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
