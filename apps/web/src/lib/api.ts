import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api`,
      headers: { "Content-Type": "application/json" },
      withCredentials: true,
    });

    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem("token");
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async login(email: string, password: string) {
    const { data } = await this.client.post("/auth/login", { email, password });
    localStorage.setItem("token", data.data.token);
    localStorage.setItem("user", JSON.stringify(data.data.user));
    return data.data;
  }

  async logout() {
    await this.client.post("/auth/logout");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  async getMe() {
    const { data } = await this.client.get("/auth/me");
    localStorage.setItem("user", JSON.stringify(data.data));
    return data.data;
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const { data } = await this.client.post("/auth/change-password", { currentPassword, newPassword });
    return data;
  }

  // Users
  async getUsers(params?: Record<string, unknown>) {
    const { data } = await this.client.get("/users", { params });
    return data;
  }

  async getUser(id: string) {
    const { data } = await this.client.get(`/users/${id}`);
    return data.data;
  }

  async createUser(user: { email: string; password: string; name: string; role: string; branchId?: string }) {
    const { data } = await this.client.post("/users", user);
    return data.data;
  }

  async updateUser(id: string, user: Partial<{ name: string; role: string; branchId: string; isActive: boolean }>) {
    const { data } = await this.client.patch(`/users/${id}`, user);
    return data.data;
  }

  async deleteUser(id: string) {
    const { data } = await this.client.delete(`/users/${id}`);
    return data;
  }

  // Branches
  async getBranches() {
    const { data } = await this.client.get("/branches");
    return data.data;
  }

  async createBranch(branch: { code: string; name: string; address: string; phone?: string }) {
    const { data } = await this.client.post("/branches", branch);
    return data.data;
  }

  // Products
  async getProducts(params?: Record<string, unknown>) {
    const { data } = await this.client.get("/products", { params });
    return data;
  }

  async getProduct(id: string) {
    const { data } = await this.client.get(`/products/${id}`);
    return data.data;
  }

  async createProduct(product: Record<string, unknown>) {
    const { data } = await this.client.post("/products", product);
    return data.data;
  }

  async updateProduct(id: string, product: Record<string, unknown>) {
    const { data } = await this.client.patch(`/products/${id}`, product);
    return data.data;
  }

  async deleteProduct(id: string) {
    const { data } = await this.client.delete(`/products/${id}`);
    return data;
  }

  async getCategories() {
    const { data } = await this.client.get("/products/categories/all");
    return data.data;
  }

  // Inventory
  async getStock(params?: Record<string, unknown>) {
    const { data } = await this.client.get("/inventory/stock", { params });
    return data;
  }

  async getStockDetail(productId: string, branchId: string) {
    const { data } = await this.client.get(`/inventory/stock/${productId}/${branchId}`);
    return data.data;
  }

  async createStockCount(count: { productId: string; batchId?: string; actualQuantity: number; reasonCode?: string; notes?: string }) {
    const { data } = await this.client.post("/inventory/count", count);
    return data.data;
  }

  async getStockCounts(params?: Record<string, unknown>) {
    const { data } = await this.client.get("/inventory/counts", { params });
    return data;
  }

  async createTransfer(transfer: { toBranchId: string; items: Array<{ productId: string; batchId?: string; quantity: number }> }) {
    const { data } = await this.client.post("/inventory/transfers", transfer);
    return data.data;
  }

  async getTransfers(params?: Record<string, unknown>) {
    const { data } = await this.client.get("/inventory/transfers", { params });
    return data;
  }

  async approveTransfer(id: string) {
    const { data } = await this.client.post(`/inventory/transfers/${id}/approve`);
    return data;
  }

  async shipTransfer(id: string) {
    const { data } = await this.client.post(`/inventory/transfers/${id}/ship`);
    return data;
  }

  async receiveTransfer(id: string) {
    const { data } = await this.client.post(`/inventory/transfers/${id}/receive`);
    return data;
  }

  async getReorderAlerts(branchId?: string) {
    const { data } = await this.client.get("/inventory/reorder-alerts", { params: { branchId } });
    return data.data;
  }

  // Sales
  async createSale(sale: Record<string, unknown>) {
    const { data } = await this.client.post("/sales", sale);
    return data.data;
  }

  async getSales(params?: Record<string, unknown>) {
    const { data } = await this.client.get("/sales", { params });
    return data;
  }

  async getSale(id: string) {
    const { data } = await this.client.get(`/sales/${id}`);
    return data.data;
  }

  async voidSale(id: string, reason: string) {
    const { data } = await this.client.post(`/sales/${id}/void`, { reason });
    return data;
  }

  async refundSale(id: string, reason: string) {
    const { data } = await this.client.post(`/sales/${id}/refund`, { reason });
    return data;
  }

  async getReceipt(id: string) {
    const { data } = await this.client.get(`/sales/${id}/receipt`);
    return data.data;
  }

  // Purchasing
  async getSuppliers(params?: Record<string, unknown>) {
    const { data } = await this.client.get("/purchasing/suppliers", { params });
    return data;
  }

  async createSupplier(supplier: Record<string, unknown>) {
    const { data } = await this.client.post("/purchasing/suppliers", supplier);
    return data.data;
  }

  async getPurchaseOrders(params?: Record<string, unknown>) {
    const { data } = await this.client.get("/purchasing/purchase-orders", { params });
    return data;
  }

  async createPurchaseOrder(po: Record<string, unknown>) {
    const { data } = await this.client.post("/purchasing/purchase-orders", po);
    return data.data;
  }

  async sendPurchaseOrder(id: string) {
    const { data } = await this.client.post(`/purchasing/purchase-orders/${id}/send`);
    return data;
  }

  async createGRN(grn: Record<string, unknown>) {
    const { data } = await this.client.post("/purchasing/grns", grn);
    return data.data;
  }

  async getGRNs(params?: Record<string, unknown>) {
    const { data } = await this.client.get("/purchasing/grns", { params });
    return data;
  }

  async matchInvoice(grnId: string, invoiceNumber: string, invoiceDate: string, items: Record<string, unknown>[]) {
    const { data } = await this.client.post("/purchasing/invoice-match", { grnId, invoiceNumber, invoiceDate, items });
    return data.data;
  }

  // Reports
  async getBranchSalesReport(params: { branchId?: string; startDate?: string; endDate?: string; groupBy?: "day" | "hour" | "month" }) {
    const { data } = await this.client.get("/reports/sales/branch", { params });
    return data.data;
  }

  async getInventoryStockOnHand(params?: Record<string, unknown>) {
    const { data } = await this.client.get("/reports/inventory/stock-on-hand", { params });
    return data.data;
  }

  async getInventoryAgeing(branchId?: string) {
    const { data } = await this.client.get("/reports/inventory/ageing", { params: { branchId } });
    return data.data;
  }

  async getInventoryExpiry(params?: { branchId?: string; days?: string }) {
    const { data } = await this.client.get("/reports/inventory/expiry", { params });
    return data.data;
  }

  async getConsolidatedDashboard(params?: { startDate?: string; endDate?: string }) {
    const { data } = await this.client.get("/reports/dashboard/consolidated", { params });
    return data.data;
  }

  async getBIRSalesReport(params: { branchId?: string; startDate?: string; endDate?: string }) {
    const { data } = await this.client.get("/reports/bir/sales", { params });
    return data.data;
  }

  // Admin
  async getConfig() {
    const { data } = await this.client.get("/admin/config");
    return data.data;
  }

  async updateConfig(config: Record<string, unknown>) {
    const { data } = await this.client.patch("/admin/config", config);
    return data;
  }

  async getAuditLogs(params?: Record<string, unknown>) {
    const { data } = await this.client.get("/admin/audit", { params });
    return data;
  }

  async getSystemHealth() {
    const { data } = await this.client.get("/admin/health");
    return data.data;
  }

  // Sync
  async syncUpload(operations: Record<string, unknown>[], lastSyncTimestamp?: string) {
    const { data } = await this.client.post("/sync/upload", { operations, lastSyncTimestamp });
    return data.data;
  }

  async getSyncStatus() {
    const { data } = await this.client.get("/sync/status");
    return data.data;
  }
}

export const api = new ApiClient();