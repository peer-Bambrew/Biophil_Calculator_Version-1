import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Save, Package } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Admin = () => {
  const [blends, setBlends] = useState([]);
  const [bomMaterials, setBomMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bomDialogOpen, setBomDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  // Blend state
  const [currentBlend, setCurrentBlend] = useState({
    blend_number: "",
    blend_name: "",
    cost_per_kg: "",
    density: "1.27",
    description: "",
    application: "",
  });
  
  // BOM Material state
  const [currentBOMMaterial, setCurrentBOMMaterial] = useState({
    material_id: "",
    material_name: "",
    cost_per_kg: "",
    gsm: "",
    width_m: "",
    unit: "kg",
    description: "",
    applicable_products: [],
  });

  useEffect(() => {
    fetchBlends();
    fetchBOMMaterials();
  }, []);

  const fetchBlends = async () => {
    try {
      const response = await axios.get(`${API}/blends`);
      setBlends(response.data);
    } catch (error) {
      console.error("Error fetching blends:", error);
      toast.error("Failed to load blends");
    }
  };

  const fetchBOMMaterials = async () => {
    try {
      const response = await axios.get(`${API}/bom-materials`);
      setBomMaterials(response.data);
    } catch (error) {
      console.error("Error fetching BOM materials:", error);
      toast.error("Failed to load BOM materials");
    }
  };

  // Blend handlers
  const handleOpenBlendDialog = (blend = null) => {
    if (blend) {
      setEditMode(true);
      setCurrentBlend(blend);
    } else {
      setEditMode(false);
      setCurrentBlend({
        blend_number: "",
        blend_name: "",
        cost_per_kg: "",
        density: "1.27",
        description: "",
        application: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSaveBlend = async () => {
    setLoading(true);
    try {
      const payload = {
        ...currentBlend,
        blend_number: parseInt(currentBlend.blend_number),
        cost_per_kg: parseFloat(currentBlend.cost_per_kg),
        density: parseFloat(currentBlend.density),
      };

      if (editMode) {
        await axios.put(`${API}/blends/${payload.blend_number}`, payload);
        toast.success("Blend updated successfully");
      } else {
        await axios.post(`${API}/blends`, payload);
        toast.success("Blend created successfully");
      }

      fetchBlends();
      setDialogOpen(false);
    } catch (error) {
      console.error("Error saving blend:", error);
      toast.error(error.response?.data?.detail || "Failed to save blend");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBlend = async (blendNumber) => {
    if (!window.confirm(`Are you sure you want to delete Blend ${blendNumber}?`)) {
      return;
    }

    try {
      await axios.delete(`${API}/blends/${blendNumber}`);
      toast.success("Blend deleted successfully");
      fetchBlends();
    } catch (error) {
      console.error("Error deleting blend:", error);
      toast.error("Failed to delete blend");
    }
  };

  // BOM Material handlers
  const handleOpenBOMDialog = (material = null) => {
    if (material) {
      setEditMode(true);
      setCurrentBOMMaterial(material);
    } else {
      setEditMode(false);
      setCurrentBOMMaterial({
        material_id: "",
        material_name: "",
        cost_per_kg: "",
        gsm: "",
        width_m: "",
        unit: "kg",
        description: "",
        applicable_products: [],
      });
    }
    setBomDialogOpen(true);
  };

  const handleSaveBOMMaterial = async () => {
    setLoading(true);
    try {
      const payload = {
        ...currentBOMMaterial,
        cost_per_kg: parseFloat(currentBOMMaterial.cost_per_kg),
        gsm: parseFloat(currentBOMMaterial.gsm),
        width_m: parseFloat(currentBOMMaterial.width_m),
      };

      if (editMode) {
        await axios.put(`${API}/bom-materials/${payload.material_id}`, payload);
        toast.success("BOM material updated successfully");
      } else {
        await axios.post(`${API}/bom-materials`, payload);
        toast.success("BOM material created successfully");
      }

      fetchBOMMaterials();
      setBomDialogOpen(false);
    } catch (error) {
      console.error("Error saving BOM material:", error);
      toast.error(error.response?.data?.detail || "Failed to save BOM material");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBOMMaterial = async (materialId) => {
    if (!window.confirm(`Are you sure you want to delete this material?`)) {
      return;
    }

    try {
      await axios.delete(`${API}/bom-materials/${materialId}`);
      toast.success("BOM material deleted successfully");
      fetchBOMMaterials();
    } catch (error) {
      console.error("Error deleting BOM material:", error);
      toast.error("Failed to delete BOM material");
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800">Admin Panel</h1>
          <p className="text-slate-600 mt-1">Manage blends and BOM materials</p>
        </div>

        <Tabs defaultValue="blends" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="blends">Blend Management</TabsTrigger>
            <TabsTrigger value="bom">BOM Materials</TabsTrigger>
          </TabsList>

          {/* Blends Tab */}
          <TabsContent value="blends" className="mt-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">Blend Management</h2>
                <p className="text-sm text-slate-600">{blends.length} blends configured</p>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => handleOpenBlendDialog()}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    data-testid="add-blend-button"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Blend
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="blend-dialog">
                  <DialogHeader>
                    <DialogTitle>{editMode ? "Edit Blend" : "Add New Blend"}</DialogTitle>
                    <DialogDescription>
                      {editMode
                        ? "Update the blend information below"
                        : "Enter the details for the new blend"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="blend_number">Blend Number *</Label>
                      <Input
                        id="blend_number"
                        type="number"
                        placeholder="21"
                        value={currentBlend.blend_number}
                        onChange={(e) =>
                          setCurrentBlend({ ...currentBlend, blend_number: e.target.value })
                        }
                        disabled={editMode}
                        data-testid="blend-number-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="blend_name">Blend Name *</Label>
                      <Input
                        id="blend_name"
                        placeholder="Blend 21"
                        value={currentBlend.blend_name}
                        onChange={(e) =>
                          setCurrentBlend({ ...currentBlend, blend_name: e.target.value })
                        }
                        data-testid="blend-name-input"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cost_per_kg">Cost per Kg (₹) *</Label>
                        <Input
                          id="cost_per_kg"
                          type="number"
                          step="0.01"
                          placeholder="130.00"
                          value={currentBlend.cost_per_kg}
                          onChange={(e) =>
                            setCurrentBlend({ ...currentBlend, cost_per_kg: e.target.value })
                          }
                          data-testid="cost-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="density">Density *</Label>
                        <Input
                          id="density"
                          type="number"
                          step="0.01"
                          placeholder="1.27"
                          value={currentBlend.density}
                          onChange={(e) =>
                            setCurrentBlend({ ...currentBlend, density: e.target.value })
                          }
                          data-testid="density-input"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="application">Application</Label>
                      <Input
                        id="application"
                        placeholder="Garment Bag"
                        value={currentBlend.application}
                        onChange={(e) =>
                          setCurrentBlend({ ...currentBlend, application: e.target.value })
                        }
                        data-testid="application-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        placeholder="For garment bags"
                        value={currentBlend.description}
                        onChange={(e) =>
                          setCurrentBlend({ ...currentBlend, description: e.target.value })
                        }
                        data-testid="description-input"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleSaveBlend}
                      disabled={loading}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      data-testid="save-blend-button"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {loading ? "Saving..." : "Save Blend"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Blend #</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Cost/Kg</TableHead>
                        <TableHead>Density</TableHead>
                        <TableHead>Application</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {blends.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                            No blends found. Add your first blend to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        blends.map((blend) => (
                          <TableRow key={blend.blend_number} data-testid={`blend-row-${blend.blend_number}`}>
                            <TableCell className="font-medium">{blend.blend_number}</TableCell>
                            <TableCell>{blend.blend_name}</TableCell>
                            <TableCell>₹{blend.cost_per_kg.toFixed(2)}</TableCell>
                            <TableCell>{blend.density}</TableCell>
                            <TableCell>{blend.application || "-"}</TableCell>
                            <TableCell className="max-w-xs truncate">
                              {blend.description || "-"}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenBlendDialog(blend)}
                                data-testid={`edit-blend-${blend.blend_number}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteBlend(blend.blend_number)}
                                data-testid={`delete-blend-${blend.blend_number}`}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BOM Materials Tab */}
          <TabsContent value="bom" className="mt-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">BOM Material Management</h2>
                <p className="text-sm text-slate-600">{bomMaterials.length} materials configured</p>
              </div>
              <Dialog open={bomDialogOpen} onOpenChange={setBomDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => handleOpenBOMDialog()}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    <Package className="mr-2 h-4 w-4" />
                    Add BOM Material
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editMode ? "Edit BOM Material" : "Add New BOM Material"}</DialogTitle>
                    <DialogDescription>
                      Configure material costs for accurate calculations
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="material_id">Material ID *</Label>
                        <Input
                          id="material_id"
                          placeholder="seal_king_tape"
                          value={currentBOMMaterial.material_id}
                          onChange={(e) =>
                            setCurrentBOMMaterial({ ...currentBOMMaterial, material_id: e.target.value })
                          }
                          disabled={editMode}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="material_name">Material Name *</Label>
                        <Input
                          id="material_name"
                          placeholder="Seal King Tape"
                          value={currentBOMMaterial.material_name}
                          onChange={(e) =>
                            setCurrentBOMMaterial({ ...currentBOMMaterial, material_name: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bom_cost_per_kg">Cost per Kg (₹) *</Label>
                        <Input
                          id="bom_cost_per_kg"
                          type="number"
                          step="0.01"
                          placeholder="215.00"
                          value={currentBOMMaterial.cost_per_kg}
                          onChange={(e) =>
                            setCurrentBOMMaterial({ ...currentBOMMaterial, cost_per_kg: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gsm">GSM *</Label>
                        <Input
                          id="gsm"
                          type="number"
                          step="0.1"
                          placeholder="130.0"
                          value={currentBOMMaterial.gsm}
                          onChange={(e) =>
                            setCurrentBOMMaterial({ ...currentBOMMaterial, gsm: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="width_m">Width (m) *</Label>
                        <Input
                          id="width_m"
                          type="number"
                          step="0.001"
                          placeholder="0.012"
                          value={currentBOMMaterial.width_m}
                          onChange={(e) =>
                            setCurrentBOMMaterial({ ...currentBOMMaterial, width_m: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bom_description">Description</Label>
                      <Input
                        id="bom_description"
                        placeholder="Material description"
                        value={currentBOMMaterial.description}
                        onChange={(e) =>
                          setCurrentBOMMaterial({ ...currentBOMMaterial, description: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleSaveBOMMaterial}
                      disabled={loading}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {loading ? "Saving..." : "Save Material"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Cost/Kg</TableHead>
                        <TableHead>GSM</TableHead>
                        <TableHead>Width (m)</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bomMaterials.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                            No BOM materials found. Add materials to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        bomMaterials.map((material) => (
                          <TableRow key={material.material_id}>
                            <TableCell className="font-medium font-mono text-sm">
                              {material.material_id}
                            </TableCell>
                            <TableCell>{material.material_name}</TableCell>
                            <TableCell>₹{material.cost_per_kg.toFixed(2)}</TableCell>
                            <TableCell>{material.gsm}</TableCell>
                            <TableCell>{material.width_m} m</TableCell>
                            <TableCell className="max-w-xs truncate">
                              {material.description || "-"}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenBOMDialog(material)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteBOMMaterial(material.material_id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
