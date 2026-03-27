# Biophil Product Cost Calculator - Algorithm & Logic

## Overview
This document explains the complete calculation logic used in the cost calculator for biodegradable film pouches.

---

## INPUT PARAMETERS

### 1. Product Specifications
- **Product Type**: Side Seal Pouch, Bottom Seal Pouch, Garment Bag, Mailer Bag
- **Dimensions** (in inches):
  - Height (max 24")
  - Width (max 25")
  - Flap (optional)
  - Gusset (optional)
- **Thickness**: Microns (min 15 microns)
- **Blend Number**: 1-100 (material grade)
- **Quantity**: Number of pieces

### 2. Printing Options
- **Type**: None, Statutory Inline, Statutory Registered, Customized
- **Colors**: Number of colors (for customized)
- **Coverage**: Percentage of printing coverage (for customized)

### 3. Additional Options
- **Variable Barcodes**: Number of barcodes per bag (0-10)
- **Sales Margin**: Percentage margin for selling price
- **Delivery Region**: North, South, East, West

### 4. Validations
- Thickness ≥ 15 microns
- Height ≤ 24 inches
- Width ≤ 25 inches

---

## CALCULATION FLOW

### STEP 1: DIMENSION CONVERSION
Convert all dimensions from inches to meters:
```
1 inch = 0.0254 meters

height_m = height_inches × 0.0254
width_m = width_inches × 0.0254
flap_m = flap_inches × 0.0254
gusset_m = gusset_inches × 0.0254
```

### STEP 2: CALCULATE OPEN DIMENSIONS

**For Side Seal Pouch, Garment Bag, Mailer Bag:**
```
open_height = height_m + flap_m
open_width = width_m + gusset_m (if gusset > 0, else width_m)
```

**For Bottom Seal Pouch:**
```
open_height = height_m + flap_m
open_width = width_m + (2 × gusset_m)  // Side gusset on both sides
```

### STEP 3: CALCULATE AREA
```
area_sq_m = open_height × open_width × 2
// Multiplied by 2 for both sides of the bag
```

### STEP 4: CALCULATE GSM (Grams per Square Meter)
```
Get blend density from database (typically 1.27 - 1.30)

GSM = thickness_microns × density
```

### STEP 5: CALCULATE WEIGHT PER BAG
```
weight_per_bag_kg = (area_sq_m × GSM) / 1000
```

### STEP 6: CALCULATE TOTAL ORDER WEIGHT (INITIAL)
```
total_order_weight_initial = weight_per_bag_kg × quantity
```

### STEP 7: DETERMINE WASTAGE PERCENTAGE
**Dynamic wastage based on order weight:**
```
if total_order_weight < 300 kg:
    wastage_percent = 15%
elif total_order_weight < 1000 kg:
    wastage_percent = 10%
else:
    wastage_percent = 6%
```

### STEP 8: APPLY WASTAGE
```
weight_with_wastage = weight_per_bag_kg × (1 + wastage_percent/100)

pieces_per_kg = 1 / weight_with_wastage
```

---

## COST CALCULATIONS

### A. MATERIAL COSTS

#### 1. Film Material Cost
```
Get blend cost per kg from database

material_cost_per_bag = weight_with_wastage × blend_cost_per_kg
```

#### 2. Seal King Tape (Garment Bags Only)
```
if product_type == "Garment Bag":
    Get seal_king_tape material from BOM database
    
    tape_length = width_m
    tape_cost_per_meter = seal_king_tape.cost_per_kg
    
    seal_king_tape_cost = tape_length × tape_cost_per_meter
else:
    seal_king_tape_cost = 0
```

#### 3. Hot Melt Adhesive (Mailer Bags Only)
```
if product_type == "Mailer Bag":
    Get hot_melt material from BOM database
    
    hot_melt_area = hot_melt.width_m × width_m
    hot_melt_weight_kg = (hot_melt_area × hot_melt.gsm) / 1000
    hot_melt_cost = hot_melt_weight_kg × hot_melt.cost_per_kg
else:
    hot_melt_cost = 0
```

#### 4. Release Liner (Mailer Bags Only)
```
if product_type == "Mailer Bag":
    Get release_liner material from BOM database
    
    release_liner_area = release_liner.width_m × width_m
    release_liner_weight_kg = (release_liner_area × release_liner.gsm) / 1000
    release_liner_cost = release_liner_weight_kg × release_liner.cost_per_kg
else:
    release_liner_cost = 0
```

#### 5. Variable Barcode Cost
```
if barcodes_per_bag > 0:
    Get variable_barcode material from BOM database
    
    barcode_cost = barcodes_per_bag × barcode_cost_per_piece (₹0.08)
else:
    barcode_cost = 0
```

**Total Material Cost:**
```
total_material_cost = material_cost_per_bag + 
                     seal_king_tape_cost + 
                     hot_melt_cost + 
                     release_liner_cost + 
                     barcode_cost
```

---

### B. CONVERSION COSTS

#### 1. Blown Film Conversion
```
blown_film_cost_per_kg = ₹13.92 (fixed)

blown_film_cost_per_bag = weight_with_wastage × blown_film_cost_per_kg
```

#### 2. Bag Making Cost
```
bag_making_cost_per_meter = ₹0.46 (fixed)
meters_per_bag = open_width

bag_making_cost_per_bag = meters_per_bag × bag_making_cost_per_meter
```

**Total Conversion Cost:**
```
total_conversion_cost = blown_film_cost_per_bag + bag_making_cost_per_bag
```

---

### C. PRINTING COST

```
if printing_type == "None":
    printing_cost = 0

elif printing_type == "Statutory Inline":
    printing_cost = ₹0.03

elif printing_type == "Statutory Registered":
    printing_cost = ₹0.05

elif printing_type == "Customized":
    base_ink_cost = ₹0.02
    color_multiplier = num_colors (minimum 1)
    coverage_multiplier = printing_coverage_percent / 100
    
    printing_cost = base_ink_cost × color_multiplier × 
                   coverage_multiplier × area_sq_m
```

---

### D. PACKAGING COST (Corrugation Boxes)

```
total_order_weight = weight_with_wastage × quantity

Get corrugation_box material from BOM database

box_capacity_kg = 12.0  // Fixed: 12 kg per box
boxes_needed = total_order_weight / box_capacity_kg

total_box_cost = boxes_needed × box_cost_per_piece (₹40)

packaging_cost_per_bag = total_box_cost / quantity
```

---

### E. LOGISTICS COST

```
packaging_weight_per_bag = 0.5 / quantity  // Approximate box weight

total_weight_with_packaging = total_order_weight + 
                              (packaging_weight_per_bag × quantity)

// Determine logistics type and rate
FTL_THRESHOLD = 5000 kg

if total_weight_with_packaging >= FTL_THRESHOLD:
    logistics_type = "FTL"
    
    if delivery_region == "North":
        logistics_rate = ₹12 per kg
    elif delivery_region == "South":
        logistics_rate = ₹8 per kg
    elif delivery_region == "West":
        logistics_rate = ₹9 per kg
    elif delivery_region == "East":
        logistics_rate = ₹15 per kg
else:
    logistics_type = "PTL"
    logistics_rate = ₹12 per kg

logistics_cost_per_bag = (weight_with_wastage + packaging_weight_per_bag) × 
                         logistics_rate
```

---

## FINAL COST CALCULATION

### 1. Total Direct Cost (Cost Price)
```
total_direct_cost = total_material_cost + 
                   total_conversion_cost + 
                   printing_cost_per_bag + 
                   packaging_cost_per_bag + 
                   logistics_cost_per_bag
```

### 2. Cost per Kg
```
cost_per_kg = total_direct_cost / weight_with_wastage
```

### 3. Sales Margin & Selling Price
```
sales_margin_amount = total_direct_cost × (sales_margin_percent / 100)

selling_price_per_bag = total_direct_cost + sales_margin_amount
```

### 4. Order Totals
```
total_order_cost = total_direct_cost × quantity

total_order_selling_price = selling_price_per_bag × quantity
```

---

## EXAMPLE CALCULATION

### Input:
- Product: Side Seal Pouch
- Height: 20 inches, Width: 18 inches
- Thickness: 60 microns
- Blend 21: ₹178/kg, Density: 1.27
- Quantity: 1000 pieces
- Barcodes: 2 per bag
- Sales Margin: 20%
- Region: South

### Step-by-Step:

**1. Dimensions:**
```
height_m = 20 × 0.0254 = 0.508 m
width_m = 18 × 0.0254 = 0.457 m
open_height = 0.508 m
open_width = 0.457 m
area = 0.508 × 0.457 × 2 = 0.4645 m²
```

**2. Weight:**
```
GSM = 60 × 1.27 = 76.20
weight_per_bag = (0.4645 × 76.20) / 1000 = 0.0354 kg
```

**3. Wastage (41.21 kg < 300 kg):**
```
wastage = 15%
weight_with_wastage = 0.0354 × 1.15 = 0.0407 kg
```

**4. Material Costs:**
```
Film: 0.0407 × 178 = ₹7.24
Barcode: 2 × 0.08 = ₹0.16
Total Material: ₹7.40
```

**5. Conversion:**
```
Blown Film: 0.0407 × 13.92 = ₹0.57
Bag Making: 0.457 × 0.46 = ₹0.21
Total Conversion: ₹0.78
```

**6. Packaging:**
```
Order weight: 40.7 kg
Boxes: 40.7 / 12 = 3.39 boxes
Box cost: 3.39 × 40 / 1000 = ₹0.14/bag
```

**7. Logistics (PTL, South):**
```
0.0407 × 12 = ₹0.49
```

**8. Total Direct Cost:**
```
₹7.40 + ₹0.78 + ₹0.14 + ₹0.49 = ₹8.81
```

**9. With 20% Margin:**
```
Margin: ₹8.81 × 0.20 = ₹1.76
Selling Price: ₹8.81 + ₹1.76 = ₹10.57 per bag
```

**10. Order Total:**
```
Cost: ₹8.81 × 1000 = ₹8,810
Selling: ₹10.57 × 1000 = ₹10,570
```

---

## KEY FORMULAS SUMMARY

| Component | Formula |
|-----------|---------|
| **Area** | `(height + flap) × (width + gusset) × 2` |
| **GSM** | `thickness × density` |
| **Weight** | `(area × GSM) / 1000` |
| **Wastage** | `<300kg: 15%, 300kg-1ton: 10%, >1ton: 6%` |
| **Material** | `weight × blend_cost` |
| **Barcode** | `barcodes × ₹0.08` |
| **Blown Film** | `weight × ₹13.92` |
| **Bag Making** | `width × ₹0.46` |
| **Packaging** | `(weight/12kg) × ₹40 / quantity` |
| **Logistics** | `weight × rate (₹8-15/kg)` |
| **Selling Price** | `direct_cost × (1 + margin%)` |

---

## ADMIN CONTROLLABLE PARAMETERS

### BOM Materials (Database)
1. Blend costs (₹/kg) and density
2. Seal King Tape (₹130/kg)
3. Hot Melt (₹215/kg, GSM: 130, Width: 0.012m)
4. Release Liner (₹265/kg, GSM: 60, Width: 0.03m)
5. Corrugation Box (₹40/box, 12kg capacity)
6. Variable Barcode (₹0.08/piece)

### Settings (Database)
1. Wastage percentages by weight range
2. Logistics rates (FTL/PTL by region)
3. Machine speeds
4. Box costs and weights

---

## NOTES

1. **All dimensions** are converted to meters for calculation
2. **Area is doubled** to account for both sides of the bag
3. **Wastage is dynamic** based on order weight
4. **Logistics type** (FTL/PTL) depends on 5 ton threshold
5. **Product-specific costs** only apply to relevant product types
6. **All costs** are admin-controllable via BOM management
7. **Margin is optional** - shows both cost and selling price

---

This algorithm ensures accurate, transparent, and maintainable cost calculations.
