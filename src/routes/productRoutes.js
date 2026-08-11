const express = require("express");
const {
  createProduct,
  getProducts,
  getProductSummary,
  getProductById,
  updateProduct,
  deleteProduct,
  adjustStock,
} = require("../controllers/productController");
const validate = require("../middlewares/validate");
const {
  createProductSchema,
  updateProductSchema,
  stockAdjustSchema,
  productIdParamSchema,
  listProductsQuerySchema,
} = require("../validation/productValidation");
const { protect } = require("../middlewares/auth");

const router = express.Router();

router.get("/summary", getProductSummary);
router.get("/", validate(listProductsQuerySchema, "query"), getProducts);
router.get("/:id", validate(productIdParamSchema, "params"), getProductById);

router.post("/", protect, validate(createProductSchema), createProduct);
router.put(
  "/:id",
  protect,
  validate(productIdParamSchema, "params"),
  validate(updateProductSchema),
  updateProduct,
);
router.patch(
  "/:id",
  protect,
  validate(productIdParamSchema, "params"),
  validate(updateProductSchema),
  updateProduct,
);
router.patch(
  "/:id/stock",
  protect,
  validate(productIdParamSchema, "params"),
  validate(stockAdjustSchema),
  adjustStock,
);
router.delete(
  "/:id",
  protect,
  validate(productIdParamSchema, "params"),
  deleteProduct,
);

module.exports = router;
