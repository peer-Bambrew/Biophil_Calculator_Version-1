import { useState, useEffect } from "react";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Clock, Package } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const History = () => {
  const [calculations, setCalculations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCalculations();
  }, []);

  const fetchCalculations = async () => {
    try {
      const response = await axios.get(`${API}/calculations`);
      setCalculations(response.data);
    } catch (error) {
      console.error("Error fetching calculations:", error);
      toast.error("Failed to load calculation history");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800">Calculation History</h1>
          <p className="text-slate-600 mt-1">View all previous cost calculations</p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-slate-500">
                <Clock className="w-12 h-12 mx-auto mb-4 animate-spin opacity-50" />
                <p>Loading calculations...</p>
              </div>
            </CardContent>
          </Card>
        ) : calculations.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-slate-500">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>No calculations yet. Start by creating your first calculation!</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {calculations.map((calc, index) => (
              <Card key={calc.id || index} data-testid={`calculation-${index}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {calc.calculation_input.product_type}
                      </CardTitle>
                      <CardDescription className="flex items-center mt-1">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDate(calc.timestamp)}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-700">
                        ₹{calc.cost_breakdown.landed_cost_per_bag.toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-500">per bag</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    {/* Specifications */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-slate-700">Specifications</h4>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Dimensions:</span>
                          <span className="font-medium">
                            {calc.calculation_input.height} × {calc.calculation_input.width} in
                          </span>
                        </div>
                        {calc.calculation_input.flap > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Flap:</span>
                            <span className="font-medium">{calc.calculation_input.flap} in</span>
                          </div>
                        )}
                        {calc.calculation_input.gusset > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Gusset:</span>
                            <span className="font-medium">{calc.calculation_input.gusset} in</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-500">Thickness:</span>
                          <span className="font-medium">{calc.calculation_input.thickness_microns} µ</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Blend:</span>
                          <span className="font-medium">#{calc.calculation_input.blend_number}</span>
                        </div>
                      </div>
                    </div>

                    {/* Cost Breakdown */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-slate-700">Cost Details</h4>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Material:</span>
                          <span className="font-medium">
                            ₹{calc.cost_breakdown.total_material_cost.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Conversion:</span>
                          <span className="font-medium">
                            ₹{calc.cost_breakdown.total_conversion_cost.toFixed(2)}
                          </span>
                        </div>
                        {calc.cost_breakdown.printing_cost_per_bag > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Printing:</span>
                            <span className="font-medium">
                              ₹{calc.cost_breakdown.printing_cost_per_bag.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-500">Other:</span>
                          <span className="font-medium">
                            ₹{(calc.cost_breakdown.packaging_cost_per_bag + calc.cost_breakdown.logistics_cost_per_bag).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t">
                          <span className="text-slate-700 font-semibold">Direct Cost:</span>
                          <span className="font-semibold">
                            ₹{calc.cost_breakdown.total_direct_cost.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-slate-700">Additional Info</h4>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Weight/Bag:</span>
                          <span className="font-medium">
                            {(calc.cost_breakdown.weight_per_bag_kg * 1000).toFixed(2)} g
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Quantity:</span>
                          <span className="font-medium">{calc.calculation_input.quantity} pcs</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Wastage:</span>
                          <span className="font-medium">{calc.calculation_input.wastage_percent}%</span>
                        </div>
                        {calc.calculation_input.printing_type !== "None" && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Printing:</span>
                            <Badge variant="secondary" className="text-xs">
                              {calc.calculation_input.printing_type}
                            </Badge>
                          </div>
                        )}
                        <div className="flex justify-between pt-1 border-t">
                          <span className="text-slate-700 font-semibold">Total Order:</span>
                          <span className="font-semibold text-green-700">
                            ₹{(calc.cost_breakdown.landed_cost_per_bag * calc.calculation_input.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
