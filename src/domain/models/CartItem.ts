export interface CartItem {
  productId: string;
  slug: string;
  title: string;
  unitPrice: number;
  quantity: number;
  imagePath: string | null;
}
