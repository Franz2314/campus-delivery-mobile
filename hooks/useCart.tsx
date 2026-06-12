/**
 * CartProvider + useCart hook.
 *
 * Estado global del carrito de compras. En MVP no persistimos a disco:
 * si el estudiante cierra la app, el carrito se reinicia (es coherente
 * con un flujo de pedido único de 5 minutos).
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export interface CartItem {
  producto_id: number | string;
  nombre: string;
  precio: number;
  cantidad: number;
  imagen_url?: string;
  negocio_id: number | string;
  negocio_nombre: string;
}

interface CartContextValue {
  items: CartItem[];
  total: number;
  itemCount: number;
  addItem: (item: Omit<CartItem, 'cantidad'>, cantidad?: number) => void;
  removeItem: (producto_id: number | string) => void;
  updateQuantity: (producto_id: number | string, cantidad: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback(
    (item: Omit<CartItem, 'cantidad'>, cantidad: number = 1) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.producto_id === item.producto_id);
        if (existing) {
          return prev.map((i) =>
            i.producto_id === item.producto_id
              ? { ...i, cantidad: i.cantidad + cantidad }
              : i,
          );
        }
        return [...prev, { ...item, cantidad }];
      });
    },
    [],
  );

  const removeItem = useCallback((producto_id: number | string) => {
    setItems((prev) => prev.filter((i) => i.producto_id !== producto_id));
  }, []);

  const updateQuantity = useCallback(
    (producto_id: number | string, cantidad: number) => {
      if (cantidad <= 0) {
        setItems((prev) => prev.filter((i) => i.producto_id !== producto_id));
        return;
      }
      setItems((prev) =>
        prev.map((i) =>
          i.producto_id === producto_id ? { ...i, cantidad } : i,
        ),
      );
    },
    [],
  );

  const clear = useCallback(() => setItems([]), []);

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.precio * i.cantidad, 0),
    [items],
  );

  const itemCount = useMemo(
    () => items.reduce((sum, i) => sum + i.cantidad, 0),
    [items],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      total,
      itemCount,
      addItem,
      removeItem,
      updateQuantity,
      clear,
    }),
    [items, total, itemCount, addItem, removeItem, updateQuantity, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart debe usarse dentro de un <CartProvider>');
  }
  return ctx;
}
