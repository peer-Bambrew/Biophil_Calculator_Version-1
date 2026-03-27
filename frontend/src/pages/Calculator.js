import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Calculator as CalcIcon } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Calculator = () => {
  const [loading, setLoading] = useState(false);
  const [blends, setBlends] = useState([]);
  const [formData, setFormData] = useState({
    product_type: "Side Seal Pouch",
    height: "",
    width: "",
    flap: "0",
    gusset: "0",
    thickness_microns: "",
    blend_number: "",
    printing_type: "None",
    num_colors: "0",
    printing_coverage_percent: "0",
    quantity: "1000",
    sales_margin_percent: "0",
  });
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchBlends();
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

  const handleInputChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCalculate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const payload = {
        ...formData,
        height: parseFloat(formData.height),
        width: parseFloat(formData.width),
        flap: parseFloat(formData.flap),
        gusset: parseFloat(formData.gusset),
        thickness_microns: parseFloat(formData.thickness_microns),
        blend_number: parseInt(formData.blend_number),
        num_colors: parseInt(formData.num_colors),
        printing_coverage_percent: parseFloat(formData.printing_coverage_percent),
        quantity: parseInt(formData.quantity),
        sales_margin_percent: parseFloat(formData.sales_margin_percent),
      };

      const response = await axios.post(`${API}/calculate`, payload);
      setResult(response.data);
      toast.success("Cost calculated successfully!");
    } catch (error) {
      console.error("Error calculating cost:", error);
      toast.error(error.response?.data?.detail || "Failed to calculate cost");
    } finally {
      setLoading(false);
    }
  };

  const selectedBlend = blends.find(
    (b) => b.blend_number === parseInt(formData.blend_number)
  );

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            Biophil Product Calculator
          </h1>
          <p className="text-slate-600">
            Calculate accurate costs for your packaging products
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Input Form */}
          <div className="lg:col-span-2">
            <Card data-testid="calculator-form">
              <CardHeader>
                <CardTitle>Product Specifications</CardTitle>
                <CardDescription>
                  Enter the details of your packaging product
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCalculate} className="space-y-6">
                  {/* Product Type */}
                  <div className="space-y-2">
                    <Label htmlFor="product_type">Product Type</Label>
                    <Select
                      value={formData.product_type}
                      onValueChange={(value) =>
                        handleInputChange("product_type", value)
                      }
                    >
                      <SelectTrigger data-testid="product-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Side Seal Pouch">Side Seal Pouch</SelectItem>
                        <SelectItem value="Bottom Seal Pouch">Bottom Seal Pouch</SelectItem>
                        <SelectItem value="Garment Bag">Garment Bag (Side Seal + Flap + Seal King Tape)</SelectItem>
                        <SelectItem value="Mailer Bag">Mailer Bag (Side Seal + Permanent Tape)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dimensions */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="height">Height (inches) *</Label>
                      <Input
                        id="height"
                        type="number"
                        step="0.01"
                        placeholder="32.00"
                        value={formData.height}
                        onChange={(e) => handleInputChange("height", e.target.value)}
                        required
                        data-testid="height-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="width">Width (inches) *</Label>
                      <Input
                        id="width"
                        type="number"
                        step="0.01"
                        placeholder="24.00"
                        value={formData.width}
                        onChange={(e) => handleInputChange("width", e.target.value)}
                        required
                        data-testid="width-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="flap">Flap (inches)</Label>
                      <Input
                        id="flap"
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={formData.flap}
                        onChange={(e) => handleInputChange("flap", e.target.value)}
                        data-testid="flap-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gusset">
                        {formData.product_type === "Bottom Seal Pouch"
                          ? "Side Gusset (inches)"
                          : "Bottom Gusset (inches)"}
                      </Label>
                      <Input
                        id="gusset"
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={formData.gusset}
                        onChange={(e) => handleInputChange("gusset", e.target.value)}
                        data-testid="gusset-input"
                      />
                    </div>
                  </div>

                  {/* Material */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="thickness_microns">Thickness (microns) *</Label>
                      <Input
                        id="thickness_microns"
                        type="number"
                        step="0.1"
                        placeholder="50"
                        value={formData.thickness_microns}
                        onChange={(e) =>
                          handleInputChange("thickness_microns", e.target.value)
                        }
                        required
                        data-testid="thickness-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="blend_number">Blend *</Label>
                      <Select
                        value={formData.blend_number}
                        onValueChange={(value) =>
                          handleInputChange("blend_number", value)
                        }
                      >
                        <SelectTrigger data-testid="blend-select">
                          <SelectValue placeholder="Select Blend" />
                        </SelectTrigger>
                        <SelectContent>
                          {blends.map((blend) => (
                            <SelectItem
                              key={blend.blend_number}
                              value={blend.blend_number.toString()}
                            >
                              Blend {blend.blend_number} - ₹{blend.cost_per_kg}/kg
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {selectedBlend && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-medium text-blue-900">
                        {selectedBlend.blend_name}
                      </p>
                      <p className="text-sm text-blue-700">
                        {selectedBlend.description} - Application: {selectedBlend.application}
                      </p>
                      <p className="text-sm text-blue-800 font-semibold mt-1">
                        Cost: ₹{selectedBlend.cost_per_kg}/kg | Density: {selectedBlend.density}
                      </p>
                    </div>
                  )}

                  {/* Printing */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-700">Printing Options</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="printing_type">Printing Type</Label>
                        <Select
                          value={formData.printing_type}
                          onValueChange={(value) =>
                            handleInputChange("printing_type", value)
                          }
                        >
                          <SelectTrigger data-testid="printing-type-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="None">None</SelectItem>
                            <SelectItem value="Statutory Inline">
                              Statutory Inline (Continuous)
                            </SelectItem>
                            <SelectItem value="Statutory Registered">
                              Statutory Registered
                            </SelectItem>
                            <SelectItem value="Customized">Customized</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.printing_type === "Customized" && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="num_colors">Number of Colors</Label>
                            <Input
                              id="num_colors"
                              type="number"
                              min="1"
                              max="8"
                              value={formData.num_colors}
                              onChange={(e) =>
                                handleInputChange("num_colors", e.target.value)
                              }
                              data-testid="num-colors-input"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="printing_coverage_percent">
                              Coverage (%)
                            </Label>
                            <Input
                              id="printing_coverage_percent"
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={formData.printing_coverage_percent}
                              onChange={(e) =>
                                handleInputChange(
                                  "printing_coverage_percent",
                                  e.target.value
                                )
                              }
                              data-testid="coverage-input"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Additional Parameters */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity (pieces)</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        value={formData.quantity}
                        onChange={(e) => handleInputChange("quantity", e.target.value)}
                        data-testid="quantity-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sales_margin_percent">Sales Margin (%)</Label>
                      <Input
                        id="sales_margin_percent"
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        placeholder="0"
                        value={formData.sales_margin_percent}
                        onChange={(e) =>
                          handleInputChange("sales_margin_percent", e.target.value)
                        }
                        data-testid="sales-margin-input"
                      />
                      <p className="text-xs text-slate-500">
                        Enter margin % to calculate selling price
                      </p>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    data-testid="calculate-button"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Calculating...
                      </>
                    ) : (
                      <>
                        <CalcIcon className="mr-2 h-4 w-4" />
                        Calculate Cost
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="lg:col-span-1">
            {result ? (
              <div className="space-y-4 sticky top-4">
                <Card data-testid="cost-breakdown">
                  <CardHeader>
                    <CardTitle>Cost Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Specifications */}
                    <div className="space-y-2 border-b pb-4">
                      <h4 className="font-semibold text-sm text-slate-700">Specifications</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-slate-500">Open Height</p>
                          <p className="font-medium">{result.open_height_m.toFixed(3)} m</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Open Width</p>
                          <p className="font-medium">{result.open_width_m.toFixed(3)} m</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Area</p>
                          <p className="font-medium">{result.area_sq_m.toFixed(4)} m²</p>
                        </div>
                        <div>
                          <p className="text-slate-500">GSM</p>
                          <p className="font-medium">{result.gsm.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Weight/Bag</p>
                          <p className="font-medium">{(result.weight_per_bag_kg * 1000).toFixed(2)} g</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Pieces/Kg</p>
                          <p className="font-medium">{(result.pieces_per_kg_after_wastage || result.pieces_per_kg || 0).toFixed(0)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Cost Details */}
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Material Cost</span>
                        <span className="font-medium">₹{result.total_material_cost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Blown Film Conv.</span>
                        <span className="font-medium">₹{result.blown_film_cost_per_bag.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Bag Making</span>
                        <span className="font-medium">₹{result.bag_making_cost_per_bag.toFixed(2)}</span>
                      </div>
                      {result.printing_cost_per_bag > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Printing</span>
                          <span className="font-medium">₹{result.printing_cost_per_bag.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Packaging</span>
                        <span className="font-medium">₹{result.packaging_cost_per_bag.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Logistics</span>
                        <span className="font-medium">₹{result.logistics_cost_per_bag.toFixed(2)}</span>
                      </div>

                      <div className="border-t pt-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold text-slate-700">Total Direct Cost (Cost Price)</span>
                          <span className="font-semibold text-slate-800">₹{result.total_direct_cost.toFixed(2)}</span>
                        </div>
                        {result.sales_margin_percent > 0 && (
                          <div className="flex justify-between text-sm text-green-600">
                            <span>Sales Margin ({result.sales_margin_percent}%)</span>
                            <span>₹{result.sales_margin_amount.toFixed(2)}</span>
                          </div>
                        )}
                      </div>

                      {/* Cost Price Display */}
                      <div className="bg-slate-100 p-4 rounded-lg border border-slate-300">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800">Cost Price per Bag</span>
                          <span className="text-2xl font-bold text-slate-700">
                            ₹{result.total_direct_cost.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-2 text-sm">
                          <span className="text-slate-600">Cost per Kg</span>
                          <span className="font-semibold text-slate-700">
                            ₹{result.cost_per_kg.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Selling Price Display (only if margin > 0) */}
                      {result.sales_margin_percent > 0 && (
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-300">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-800">Selling Price per Bag</span>
                            <span className="text-2xl font-bold text-green-700">
                              ₹{result.selling_price_per_bag.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 mt-1">
                            (Including {result.sales_margin_percent}% margin)
                          </div>
                        </div>
                      )}

                      {formData.quantity && (
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-slate-700">Total Cost ({formData.quantity} pcs)</span>
                              <span className="text-lg font-bold text-slate-800">
                                ₹{result.total_order_cost.toFixed(2)}
                              </span>
                            </div>
                            {result.sales_margin_percent > 0 && (
                              <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                                <span className="text-sm font-medium text-green-700">Total Selling Price ({formData.quantity} pcs)</span>
                                <span className="text-lg font-bold text-green-700">
                                  ₹{result.total_order_selling_price.toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-slate-500 py-12">
                    <CalcIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p>Fill in the form and click Calculate to see the cost breakdown</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calculator;
