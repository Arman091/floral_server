import ProductModel from "../model/productSchema.js";

export const getAllProducts = async (req, res) => {
  try {
    const products = await ProductModel.find({});
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getProductDetailById = async (req, res) => {
  try {
    const id = req.params.id;

    const product = await ProductModel.findOne({ id: id });
    // console.log(product);
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
