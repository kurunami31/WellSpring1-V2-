import { useState } from "react";
import { UploadCloud, Database, RotateCcw, Wifi, WifiOff } from "lucide-react";
import { Link } from "react-router-dom";
import { usePrototype } from "@/context/PrototypeContext";
import { EmptyState, Metric, PageHeader, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function OfflinePage() {
  const { isOnline, setOnline, offlineQueue, lastSyncedAt, syncQueue, resetDemo, sales } = usePrototype();
  const [confirmReset, setConfirmReset] = useState(false);
  const pendingValue = offlineQueue.reduce((sum, operation) => sum + operation.sale.total, 0);
  const syncedSales = sales.filter((sale) => !sale.offline).length;

  const changeConnection = (online: boolean) => {
    setOnline(online);
    toast({ variant: "info", title: online ? "Connection restored" : "Offline mode enabled", description: online ? "You can now synchronize any queued sales." : "New checkout receipts will be stored on this device." });
  };

  const synchronize = () => {
    try {
      const count = syncQueue();
      toast({ variant: "success", title: count ? `${count} offline sale${count === 1 ? "" : "s"} synchronized` : "Queue already up to date", description: count ? "Receipt status is now Synced in Reports. Existing stock was not deducted again." : "There are no pending operations to upload." });
    } catch (caught) {
      toast({ variant: "error", title: "Synchronization unavailable", description: caught instanceof Error ? caught.message : "Reconnect and try again." });
    }
  };

  const reset = () => {
    resetDemo();
    setConfirmReset(false);
    toast({ variant: "success", title: "Demo data restored", description: "Products, sales, purchase orders, users, and the offline queue returned to their initial state." });
  };

  return (
    <div>
      <PageHeader eyebrow="Resilience · Local-first checkout" title="Offline & synchronization" description="Continue serving during a connection interruption. Queued receipts stay visible until an explicit sync uploads them once and clears the queue." actions={<StatusBadge status={isOnline ? "ONLINE" : "OFFLINE"} />} />
      <section className="mb-6 grid gap-5 border-y border-[#cbdce5] py-5 sm:grid-cols-2 xl:grid-cols-4" aria-label="Synchronization summary"><Metric label="Connection" value={isOnline ? "Online" : "Offline"} note={isOnline ? "Server operations available" : "Using local prototype storage"} /><Metric label="Pending sales" value={String(offlineQueue.length)} note="Waiting for synchronization" /><Metric label="Pending value" value={formatCurrency(pendingValue)} note="Locally issued receipts" /><Metric label="Synced sales" value={String(syncedSales)} note={`Last check ${formatDateTime(lastSyncedAt)}`} /></section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="queue-title">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 id="queue-title" className="section-title">Device sync queue</h2><p className="meta mt-1">Operations remain on this device until you upload them.</p></div><Button onClick={synchronize} disabled={!isOnline || offlineQueue.length === 0}><UploadCloud aria-hidden="true" className="mr-2 h-4 w-4" />{offlineQueue.length ? `Sync ${offlineQueue.length} sale${offlineQueue.length === 1 ? "" : "s"}` : "Queue is clear"}</Button></div>
          {!isOnline && <div role="status" className="mb-4 border-l-4 border-[#855b13] bg-[#fbf1d8] px-4 py-3 text-sm text-[#855b13]">Synchronization is paused while offline. Your queued sales are safe in local storage.</div>}
          <div className="table-shell">{offlineQueue.length === 0 ? <EmptyState title="No offline operations" description={isOnline ? "The device is fully synchronized. Switch to offline mode and complete a sale to test the recovery flow." : "Complete a sale at the point of sale. Its receipt will appear in this queue."} action={<Button asChild variant="outline"><Link to="/pos">Open point of sale</Link></Button>} /> : <table className="data-table min-w-[720px]"><thead><tr><th scope="col">Receipt</th><th scope="col">Created on device</th><th scope="col" className="text-right">Lines</th><th scope="col" className="text-right">Value</th><th scope="col">Status</th></tr></thead><tbody>{offlineQueue.map((operation) => <tr key={operation.id}><td className="font-semibold text-[#102a43]">{operation.sale.receiptNumber}</td><td>{formatDateTime(operation.createdAt)}</td><td className="text-right">{operation.sale.items.length}</td><td className="text-right">{formatCurrency(operation.sale.total)}</td><td><StatusBadge status="PENDING" /></td></tr>)}</tbody></table>}</div>
          <div className="mt-5 border-l-2 border-[#087f8c] pl-4 text-sm leading-6 text-[#486581]"><h3 className="font-semibold text-[#102a43]">What synchronization changes</h3><p>The receipt's status changes from Pending to Synced in Reports. The local queue is cleared. Inventory is not deducted a second time because stock was already reserved when the offline receipt was issued.</p></div>
        </section>

        <aside className="space-y-5">
          <section className="panel p-5" aria-labelledby="connection-title"><div className="flex items-center gap-3">{isOnline ? <Wifi aria-hidden="true" className="h-6 w-6 text-[#087f8c]" /> : <WifiOff aria-hidden="true" className="h-6 w-6 text-[#855b13]" />}<div><h2 id="connection-title" className="text-sm font-semibold">Connection simulator</h2><p className="text-xs text-[#486581]">Test both states without changing your network.</p></div></div>{isOnline ? <Button variant="outline" className="mt-4 w-full" onClick={() => changeConnection(false)}><WifiOff aria-hidden="true" className="mr-2 h-4 w-4" />Simulate offline mode</Button> : <Button className="mt-4 w-full" onClick={() => changeConnection(true)}><Wifi aria-hidden="true" className="mr-2 h-4 w-4" />Restore connection</Button>}</section>
          <section className="panel p-5" aria-labelledby="walkthrough-title"><h2 id="walkthrough-title" className="text-sm font-semibold">Five-step demonstration</h2><ol className="mt-3 space-y-3 text-xs leading-5 text-[#486581]"><li><strong className="text-[#102a43]">1.</strong> Simulate offline mode.</li><li><strong className="text-[#102a43]">2.</strong> Open POS and issue a cash receipt.</li><li><strong className="text-[#102a43]">3.</strong> Return here and inspect the queued sale.</li><li><strong className="text-[#102a43]">4.</strong> Restore the connection and select Sync.</li><li><strong className="text-[#102a43]">5.</strong> Open Reports and confirm Synced status.</li></ol></section>
          <section className="panel p-5" aria-labelledby="storage-title"><Database aria-hidden="true" className="h-5 w-5 text-[#087f8c]" /><h2 id="storage-title" className="mt-3 text-sm font-semibold">Local prototype storage</h2><p className="mt-1 text-xs leading-5 text-[#486581]">Sales and operational changes persist in this browser. Resetting removes only WellSpring's demo state, not your account credentials or unrelated site data.</p>{confirmReset ? <div className="mt-4 border border-[#a12c2c] bg-[#fae9e7] p-3"><p className="text-xs font-semibold text-[#a12c2c]">Discard every demo change?</p><div className="mt-3 flex gap-2"><Button variant="destructive" size="sm" onClick={reset}>Yes, reset</Button><Button variant="outline" size="sm" onClick={() => setConfirmReset(false)}>Cancel</Button></div></div> : <Button variant="ghost" className="mt-3 px-0 text-[#a12c2c]" onClick={() => setConfirmReset(true)}><RotateCcw aria-hidden="true" className="mr-2 h-4 w-4" />Reset demo data</Button>}</section>
        </aside>
      </div>
    </div>
  );
}
