'use client'

import { useState, useTransition, useOptimistic, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, CheckCircle2, Banknote, CreditCard, Smartphone,
  Shuffle, Maximize2, Minimize2, Scissors, Printer, RotateCcw,
  ShoppingBag, ChevronLeft, ChevronDown, User, Scan, Download,
} from 'lucide-react'
import Link from 'next/link'
import {
  createReceipt, addServiceToReceipt, addProductToReceipt,
  removeServiceLine, removeProductLine, completeReceipt, voidReceipt,
} from '@/lib/actions/receipts'
import { sendReceiptEmail } from '@/lib/actions/email'
import { formatCurrency, formatDate, calcCommissionAmt } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'
import { BarcodeScanner } from '@/components/ui/barcode-scanner'
import { SearchInput } from '@/components/ui/search-input'
import { ReceiptEmailSender } from '@/components/ui/receipt-email-sender'
import { ReceiptQrCode } from '@/components/ui/qr-code'
import { playSuccess, playComplete, playError } from '@/lib/sounds'
import { MonsteraLeaf } from '@/components/ui/monstera-leaf'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import type { PaymentMethod } from '@/lib/supabase/types'

// ── Types ────────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'selling' | 'paying' | 'voucher'

type PosService = {
  id: string
  price_charged:    number
  commission_amt:   number
  commission_type:  'percentage' | 'fixed'
  commission_value: number
  service_name:     string
  worker_name:      string
}

type PosProduct = {
  id:           string
  quantity:     number
  unit_price:   number
  subtotal:     number
  product_name: string
}

type ServiceOpt = { type: 'add'; item: PosService } | { type: 'remove'; id: string }
type ProductOpt = { type: 'add'; item: PosProduct } | { type: 'remove'; id: string }

type ServiceCatalog = {
  id:               string
  name:             string
  base_price:       number
  commission_type:  'percentage' | 'fixed'
  commission_value: number
}
type Worker  = { id: string; full_name: string }
type Product = { id: string; name: string; price: number; barcode?: string | null }

interface Props {
  workers:  Worker[]
  services: ServiceCatalog[]
  products: Product[]
}

// ── Constants ────────────────────────────────────────────────────────────────

const SPRING      = { type: 'spring', stiffness: 500, damping: 28 } as const
const SPRING_FAST = { type: 'spring', stiffness: 700, damping: 24 } as const

const PAYMENT_METHODS = [
  { value: 'cash',     label: 'Efectivo',     icon: Banknote },
  { value: 'card',     label: 'Tarjeta',      icon: CreditCard },
  { value: 'transfer', label: 'Transferencia',icon: Smartphone },
  { value: 'mixed',    label: 'Mixto',        icon: Shuffle },
] as const

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', mixed: 'Mixto',
}

// ── Main component ────────────────────────────────────────────────────────────

export function PosClient({ workers, services, products }: Props) {
  const posRef = useRef<HTMLDivElement>(null)

  // Phase
  const [phase,          setPhase]         = useState<Phase>('idle')
  const [receiptId,      setReceiptId]     = useState<string | null>(null)
  const [isFullscreen,   setIsFullscreen]  = useState(false)
  const [isPending,      startTransition]  = useTransition()

  // Worker identification
  const [activeWorkerId, setActiveWorkerId] = useState<string | null>(null)
  const activeWorker = workers.find(w => w.id === activeWorkerId)

  // Order items (source of truth + optimistic views)
  const [posServices, setPosServices] = useState<PosService[]>([])
  const [posProducts, setPosProducts] = useState<PosProduct[]>([])

  const [optServices, applyServiceOpt] = useOptimistic<PosService[], ServiceOpt>(
    posServices,
    (state, action) =>
      action.type === 'add'
        ? [...state, action.item]
        : state.filter(s => s.id !== action.id),
  )
  const [optProducts, applyProductOpt] = useOptimistic<PosProduct[], ProductOpt>(
    posProducts,
    (state, action) =>
      action.type === 'add'
        ? [...state, action.item]
        : state.filter(p => p.id !== action.id),
  )

  // Catalog interaction
  const [catalogTab,        setCatalogTab]        = useState<'service' | 'product'>('service')
  const [catalogQuery,      setCatalogQuery]      = useState('')
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
  const [selectedWorkerId,  setSelectedWorkerId]  = useState<string | null>(null)

  // Barcode scanner
  const [showScanner,   setShowScanner]   = useState(false)
  const [scanError,     setScanError]     = useState<string | null>(null)

  // Mobile UI
  const [showWorkerPicker,  setShowWorkerPicker]  = useState(false)
  const [showMobileCatalog, setShowMobileCatalog] = useState(false)

  // Completed sale data
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [completedAt,   setCompletedAt]   = useState('')

  // Fullscreen listener
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // Computed (use optimistic lists for instant UI)
  const selectedService = services.find(s => s.id === selectedServiceId)
  const totalServices   = optServices.reduce((s, l) => s + l.price_charged, 0)
  const totalProducts   = optProducts.reduce((s, l) => s + l.subtotal, 0)
  const totalAmount     = totalServices + totalProducts
  const hasItems        = optServices.length > 0 || optProducts.length > 0

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await posRef.current?.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  }

  const handleStart = () => {
    if (!activeWorkerId) return
    // Immediately show selling phase — receipt ID arrives in the background
    setSelectedWorkerId(activeWorkerId)
    setPhase('selling')
    startTransition(async () => {
      const { data } = await createReceipt({ worker_id: activeWorkerId })
      if (data) setReceiptId(data.id)
    })
  }

  const handleAddService = () => {
    if (!receiptId || !selectedServiceId || !selectedWorkerId || !selectedService) return
    const worker  = workers.find(w => w.id === selectedWorkerId)!
    const price   = selectedService.base_price
    const commAmt = calcCommissionAmt(price, selectedService.commission_type, selectedService.commission_value)
    const tempId  = crypto.randomUUID()
    const tempItem: PosService = {
      id: tempId, price_charged: price, commission_amt: commAmt,
      commission_type: selectedService.commission_type, commission_value: selectedService.commission_value,
      service_name: selectedService.name, worker_name: worker.full_name,
    }

    setSelectedServiceId(null)
    startTransition(async () => {
      applyServiceOpt({ type: 'add', item: tempItem })

      const { data } = await addServiceToReceipt({
        receipt_id: receiptId, service_id: selectedServiceId,
        worker_id: selectedWorkerId, price_charged: price,
      })

      if (data) {
        setPosServices(prev => [...prev.filter(s => s.id !== tempId), {
          id:               data.id,
          price_charged:    data.price_charged,
          commission_amt:   data.commission_amt,
          commission_type:  data.commission_type as 'percentage' | 'fixed',
          commission_value: data.commission_value,
          service_name:     (data.service_catalog as { name: string })?.name ?? selectedService.name,
          worker_name:      (data.workers as { full_name: string })?.full_name ?? worker.full_name,
        }])
      }
      playSuccess()
    })
  }

  const handleAddProduct = (productId: string) => {
    if (!receiptId) return
    const prd    = products.find(p => p.id === productId)!
    const tempId = crypto.randomUUID()
    const tempItem: PosProduct = {
      id: tempId, quantity: 1, unit_price: prd.price, subtotal: prd.price, product_name: prd.name,
    }

    startTransition(async () => {
      applyProductOpt({ type: 'add', item: tempItem })

      const { data } = await addProductToReceipt({ receipt_id: receiptId, product_id: productId })

      if (data) {
        setPosProducts(prev => [...prev.filter(p => p.id !== tempId), {
          id:           data.id,
          quantity:     data.quantity,
          unit_price:   data.unit_price,
          subtotal:     data.subtotal,
          product_name: (data.product_catalog as { name: string })?.name ?? prd.name,
        }])
      }
      playSuccess()
    })
  }

  const handleScan = (code: string) => {
    setShowScanner(false)
    const product = products.find(p => p.barcode === code)
    if (product) {
      setScanError(null)
      handleAddProduct(product.id)
    } else {
      playError()
      setScanError(`Código "${code}" no encontrado en el catálogo`)
      setTimeout(() => setScanError(null), 3500)
    }
  }

  const handleRemoveService = (id: string) => {
    startTransition(async () => {
      applyServiceOpt({ type: 'remove', id })
      await removeServiceLine(id, receiptId!)
      setPosServices(prev => prev.filter(s => s.id !== id))
    })
  }

  const handleRemoveProduct = (id: string) => {
    startTransition(async () => {
      applyProductOpt({ type: 'remove', id })
      await removeProductLine(id, receiptId!)
      setPosProducts(prev => prev.filter(p => p.id !== id))
    })
  }

  const handleConfirmPayment = (pm: PaymentMethod) => {
    // Immediately show voucher — server completion runs in background
    setPaymentMethod(pm)
    setCompletedAt(new Date().toISOString())
    setPhase('voucher')
    playComplete()
    startTransition(async () => {
      await completeReceipt(receiptId!, pm)
    })
  }

  const resetState = () => {
    setReceiptId(null)
    setPosServices([])
    setPosProducts([])
    setPaymentMethod('cash')
    setCompletedAt('')
    setSelectedServiceId(null)
    setSelectedWorkerId(null)
    setCatalogTab('service')
    setActiveWorkerId(null)
    setPhase('idle')
  }

  const handleNewSale = () => {
    // If coming from voucher phase (completed sale), just reset
    if (phase === 'voucher') { resetState(); return }
    // If there's an open receipt mid-sale, void it silently
    if (receiptId) {
      startTransition(async () => {
        await voidReceipt(receiptId)
      })
    }
    resetState()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      ref={posRef}
      className="flex flex-col h-[calc(100dvh-80px)] md:h-dvh overflow-hidden bg-[#F2F7F7]"
    >
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-4 md:px-5 h-14 bg-white border-b-2 border-zinc-100 flex-shrink-0 print:hidden">
        <div className="flex items-center gap-3">
          {phase === 'idle' && (
            <Link href="/dashboard" className="p-2 -ml-2 text-zinc-400 hover:text-zinc-700 transition-colors">
              <ChevronLeft size={20} />
            </Link>
          )}
          {phase !== 'idle' && (
            <button
              onClick={handleNewSale}
              className="p-2 -ml-2 text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-terra-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Scissors size={14} className="text-white" strokeWidth={2.2} />
            </div>
            <span className="font-black text-[#3D5151] tracking-tight">cafuné</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Active worker badge — tap to switch */}
          {activeWorker && phase !== 'idle' && (
            <div className="relative">
              <motion.button
                onClick={() => setShowWorkerPicker(v => !v)}
                whileTap={{ scale: 0.92 }}
                transition={SPRING_FAST}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 rounded-full"
              >
                <User size={13} className="text-rose-600" />
                <span className="text-xs font-bold text-rose-700">{activeWorker.full_name.split(' ')[0]}</span>
                <ChevronDown size={11} className="text-rose-500" />
              </motion.button>
              <AnimatePresence>
                {showWorkerPicker && (
                  <motion.div
                    key="worker-picker"
                    initial={{ opacity: 0, y: -6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.95 }}
                    transition={SPRING_FAST}
                    className="absolute top-full mt-2 right-0 bg-white rounded-2xl shadow-xl shadow-zinc-900/10 border border-zinc-100 p-3 flex gap-2 flex-wrap min-w-max z-50"
                  >
                    {workers.map(w => (
                      <motion.button
                        key={w.id}
                        onClick={() => {
                          setActiveWorkerId(w.id)
                          setSelectedWorkerId(w.id)
                          setShowWorkerPicker(false)
                        }}
                        whileTap={{ scale: 0.91 }}
                        className={`px-3 py-2 rounded-xl text-sm font-bold border-2 transition-colors ${
                          w.id === activeWorkerId
                            ? 'border-rose-500 bg-rose-600 text-white'
                            : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300'
                        }`}
                      >
                        {w.full_name.split(' ')[0]}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Item count */}
          {phase === 'selling' && hasItems && (
            <span className="text-xs font-bold text-zinc-400 tabular-nums hidden sm:block">
              {optServices.length + optProducts.length} ítem{optServices.length + optProducts.length !== 1 ? 's' : ''}
            </span>
          )}

          {/* Fullscreen toggle */}
          <motion.button
            onClick={handleFullscreen}
            whileTap={{ scale: 0.90 }}
            transition={SPRING_FAST}
            className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition-all"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </motion.button>
        </div>
      </header>

      {/* ── Phase content ── */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">

          {/* ══ IDLE: Worker selection ══ */}
          {phase === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={SPRING}
              className="relative flex flex-col items-center justify-center h-full gap-8 p-6 print:hidden overflow-hidden"
            >
              {/* Monstera decorations */}
              <div className="absolute top-0 right-0 w-[180px] md:w-[280px] translate-x-[28%] -translate-y-[12%] pointer-events-none select-none" aria-hidden="true">
                <MonsteraLeaf variant="full" className="text-[#568A66] opacity-[0.10] w-full h-full" />
              </div>
              <div className="absolute bottom-0 left-0 w-[140px] md:w-[200px] -translate-x-[22%] translate-y-[18%] pointer-events-none select-none" aria-hidden="true">
                <MonsteraLeaf variant="small" className="text-[#3D6B4F] opacity-[0.08] w-full h-full" />
              </div>
              <div className="hidden md:block absolute top-1/2 left-0 w-[100px] -translate-x-[38%] -translate-y-[60%] pointer-events-none select-none" aria-hidden="true">
                <MonsteraLeaf variant="young" className="text-[#7FB898] opacity-[0.10] w-full h-full" />
              </div>

              <div className="relative text-center">
                <div className="w-20 h-20 bg-terra-500 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-terra-500/25">
                  <Scissors size={36} className="text-white" strokeWidth={2} />
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-[#3D5151] mb-2">Nueva venta</h1>
                <p className="text-zinc-400 text-base">¿Quién atiende?</p>
              </div>

              {/* Worker chips */}
              <div className="flex flex-wrap gap-3 justify-center max-w-sm">
                {workers.map(w => (
                  <motion.button
                    key={w.id}
                    onClick={() => setActiveWorkerId(w.id === activeWorkerId ? null : w.id)}
                    whileTap={{ scale: 0.92 }}
                    animate={{ scale: w.id === activeWorkerId ? 1.05 : 1 }}
                    transition={SPRING}
                    className={`px-6 py-3.5 rounded-2xl text-base font-bold border-2 transition-colors ${
                      w.id === activeWorkerId
                        ? 'border-rose-500 bg-rose-600 text-white shadow-lg shadow-rose-600/25'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                    }`}
                  >
                    {w.full_name}
                  </motion.button>
                ))}
              </div>

              {/* Start button — only shown when a worker is selected */}
              <AnimatePresence>
                {activeWorkerId && (
                  <motion.button
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 16 }}
                    transition={SPRING}
                    onClick={handleStart}
                    disabled={isPending}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-3 px-10 py-5 bg-rose-900 text-white rounded-3xl text-xl font-black shadow-2xl shadow-rose-900/25 hover:bg-rose-800 disabled:opacity-60"
                  >
                    {isPending
                      ? <><Spinner size={22} /> Iniciando...</>
                      : <><Plus size={24} strokeWidth={2.5} /> Iniciar venta</>
                    }
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ══ SELLING ══ */}
          {(phase === 'selling' || phase === 'paying') && (
            <motion.div
              key="selling"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={SPRING}
              className="flex h-full"
            >
              {/* ── LEFT: Order summary ── */}
              <div className="flex flex-col w-full md:w-[42%] lg:w-[38%] bg-white border-r-2 border-zinc-100 flex-shrink-0 overflow-hidden">

                {/* Items list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
                  {!hasItems && (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-300 gap-3 py-10">
                      <ShoppingBag size={40} strokeWidth={1} />
                      <p className="text-sm font-medium text-center">
                        <span className="md:hidden">Toca <Plus size={13} className="inline -mt-0.5" /> para agregar<br />servicios o productos</span>
                        <span className="hidden md:inline">Selecciona un servicio o producto<br />del catálogo</span>
                      </p>
                    </div>
                  )}

                  {optServices.map(s => (
                    <motion.div
                      key={s.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={SPRING}
                      className="flex items-start justify-between gap-2 bg-zinc-50 rounded-2xl px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#3D5151] truncate">{s.service_name}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">{s.worker_name}</p>
                        <p className="text-[11px] text-rose-500 font-medium mt-0.5">
                          Com. {formatCurrency(s.commission_amt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-base font-bold tabular-nums">{formatCurrency(s.price_charged)}</span>
                        <motion.button
                          whileTap={{ scale: 0.78, rotate: '-8deg' }}
                          transition={SPRING_FAST}
                          onClick={() => handleRemoveService(s.id)}
                          className="p-1.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <Trash2 size={14} />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}

                  {optProducts.map(p => (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={SPRING}
                      className="flex items-center justify-between gap-2 bg-zinc-50 rounded-2xl px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#3D5151] truncate">{p.product_name}</p>
                        {p.quantity > 1 && <p className="text-xs text-zinc-400">×{p.quantity}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-base font-bold tabular-nums">{formatCurrency(p.subtotal)}</span>
                        <motion.button
                          whileTap={{ scale: 0.78, rotate: '-8deg' }}
                          transition={SPRING_FAST}
                          onClick={() => handleRemoveProduct(p.id)}
                          className="p-1.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <Trash2 size={14} />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Total + action */}
                <div className="flex-shrink-0 border-t-2 border-zinc-100 p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-zinc-400 uppercase tracking-wide">Total</span>
                    <motion.span
                      key={totalAmount}
                      initial={{ scale: 1.1, color: '#76A6A5' }}
                      animate={{ scale: 1,   color: '#3D5151' }}
                      transition={SPRING_FAST}
                      className="text-2xl font-black tabular-nums"
                    >
                      {formatCurrency(totalAmount)}
                    </motion.span>
                  </div>
                  <motion.button
                    onClick={() => setPhase('paying')}
                    disabled={isPending || !hasItems}
                    whileTap={{ scale: 0.96 }}
                    transition={SPRING}
                    className="w-full py-4 bg-rose-900 text-white rounded-2xl text-base font-black hover:bg-rose-800 disabled:opacity-40 flex items-center justify-center gap-2.5 shadow-lg shadow-rose-900/15 transition-opacity"
                  >
                    <CheckCircle2 size={20} strokeWidth={2.5} /> Completar atención
                  </motion.button>
                </div>
              </div>

              {/* ── RIGHT: Catalog (tablet+) ── */}
              <div className="hidden md:flex flex-col flex-1 overflow-hidden bg-[#F2F7F7]">

                {/* Tabs */}
                <div className="flex gap-3 p-4 border-b-2 border-zinc-100 bg-white flex-shrink-0">
                  {(['service', 'product'] as const).map(tab => (
                    <motion.button
                      key={tab}
                      onClick={() => { setCatalogTab(tab); setCatalogQuery('') }}
                      whileTap={{ scale: 0.96 }}
                      transition={SPRING}
                      className={`flex-1 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
                        catalogTab === tab
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                          : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                      }`}
                    >
                      {tab === 'service'
                        ? <><Scissors size={15} strokeWidth={2} /> Servicios</>
                        : <><ShoppingBag size={15} /> Productos</>
                      }
                    </motion.button>
                  ))}
                </div>

                {/* Catalog grid */}
                <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">

                  {/* Search */}
                  <div className="mb-4">
                    <SearchInput
                      value={catalogQuery}
                      onChange={q => { setCatalogQuery(q); setSelectedServiceId(null) }}
                      placeholder={catalogTab === 'service' ? 'Buscar servicio…' : 'Buscar producto…'}
                    />
                  </div>

                  {/* ─ Services ─ */}
                  {catalogTab === 'service' && (
                    <>
                      {services.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-300 gap-2">
                          <Scissors size={36} strokeWidth={1} />
                          <p className="text-sm">Sin servicios en el catálogo</p>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 mb-5">
                            {services.filter(s =>
                              !catalogQuery || s.name.toLowerCase().includes(catalogQuery.toLowerCase())
                            ).map(svc => (
                              <motion.button
                                key={svc.id}
                                onClick={() => {
                                  setSelectedServiceId(svc.id === selectedServiceId ? null : svc.id)
                                }}
                                whileTap={{ scale: 0.93 }}
                                animate={{ scale: svc.id === selectedServiceId ? 1.03 : 1 }}
                                transition={SPRING}
                                className={`text-left p-4 rounded-2xl border-2 transition-colors ${
                                  svc.id === selectedServiceId
                                    ? 'border-rose-500 bg-rose-50 shadow-md shadow-rose-500/10'
                                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                                }`}
                              >
                                <p className="text-sm font-bold text-[#3D5151] leading-tight">{svc.name}</p>
                                <p className="text-xs font-bold text-terra-500 mt-1.5 tabular-nums">{formatCurrency(svc.base_price)}</p>
                              </motion.button>
                            ))}
                          </div>

                          {/* Worker + price confirmation */}
                          <AnimatePresence>
                            {selectedService && (
                              <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 12 }}
                                transition={SPRING}
                                className="bg-white rounded-2xl border-2 border-zinc-100 p-5 space-y-4"
                              >
                                <p className="text-xs font-black uppercase tracking-widest text-zinc-400">
                                  {selectedService.name}
                                </p>

                                {/* Workers */}
                                <div>
                                  <p className="text-xs font-bold text-zinc-400 mb-2.5">Trabajadora</p>
                                  <div className="flex flex-wrap gap-2">
                                    {workers.map(w => (
                                      <motion.button
                                        key={w.id}
                                        onClick={() => setSelectedWorkerId(w.id === selectedWorkerId ? null : w.id)}
                                        whileTap={{ scale: 0.91 }}
                                        animate={{ scale: w.id === selectedWorkerId ? 1.05 : 1 }}
                                        transition={SPRING}
                                        className={`px-3.5 py-2 rounded-xl text-sm font-bold border-2 transition-colors ${
                                          w.id === selectedWorkerId
                                            ? 'border-rose-500 bg-rose-600 text-white shadow-md shadow-rose-600/20'
                                            : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300'
                                        }`}
                                      >
                                        {w.full_name.split(' ')[0]}
                                      </motion.button>
                                    ))}
                                  </div>
                                </div>

                                {/* Price summary + add */}
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-base font-black tabular-nums text-[#3D5151]">
                                      {formatCurrency(selectedService.base_price)}
                                    </p>
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                      Com.{' '}
                                      {selectedService.commission_type === 'percentage'
                                        ? `${selectedService.commission_value}%`
                                        : formatCurrency(selectedService.commission_value)
                                      }
                                      {' → '}
                                      {formatCurrency(
                                        calcCommissionAmt(
                                          selectedService.base_price,
                                          selectedService.commission_type,
                                          selectedService.commission_value,
                                        )
                                      )}
                                    </p>
                                  </div>
                                  <motion.button
                                    onClick={handleAddService}
                                    disabled={!selectedWorkerId || isPending}
                                    whileTap={{ scale: 0.92 }}
                                    transition={SPRING}
                                    className="flex items-center gap-2 px-5 py-3.5 bg-rose-900 text-white rounded-xl font-bold text-sm hover:bg-rose-800 disabled:opacity-40 shadow-md shadow-rose-900/15 transition-opacity"
                                  >
                                    {isPending ? <Spinner size={15} /> : <Plus size={15} strokeWidth={2.5} />}
                                    Agregar
                                  </motion.button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      )}
                    </>
                  )}

                  {/* ─ Products ─ */}
                  {catalogTab === 'product' && (
                    <>
                      {/* Scan button + error */}
                      <div className="mb-4">
                        <motion.button
                          onClick={() => setShowScanner(true)}
                          whileTap={{ scale: 0.95 }}
                          transition={SPRING}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-zinc-200 bg-white text-sm font-bold text-zinc-600 hover:border-rose-400 hover:text-rose-600 transition-colors w-full justify-center"
                        >
                          <Scan size={16} />
                          Escanear código de barras
                        </motion.button>
                        <AnimatePresence>
                          {scanError && (
                            <motion.p
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="text-xs text-red-500 font-medium mt-2 text-center"
                            >
                              {scanError}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>

                      {products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-zinc-300 gap-2">
                          <ShoppingBag size={36} strokeWidth={1} />
                          <p className="text-sm">Sin productos en el catálogo</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                          {products.filter(p =>
                            !catalogQuery ||
                            p.name.toLowerCase().includes(catalogQuery.toLowerCase()) ||
                            (p.barcode ?? '').includes(catalogQuery)
                          ).map(prd => (
                            <motion.button
                              key={prd.id}
                              onClick={() => handleAddProduct(prd.id)}
                              whileTap={{ scale: 0.91 }}
                              transition={SPRING}
                              className="text-left p-4 rounded-2xl border-2 border-zinc-200 bg-white hover:border-rose-300 hover:bg-rose-50 active:border-rose-500 transition-colors"
                            >
                              <p className="text-sm font-bold text-[#3D5151] leading-tight">{prd.name}</p>
                              <p className="text-xs font-bold text-terra-500 mt-1.5 tabular-nums">{formatCurrency(prd.price)}</p>
                              {prd.barcode && (
                                <p className="text-[10px] text-zinc-300 font-mono mt-1 truncate">{prd.barcode}</p>
                              )}
                            </motion.button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ VOUCHER ══ */}
          {phase === 'voucher' && (
            <motion.div
              key="voucher"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={SPRING}
              className="flex flex-col items-center justify-start h-full overflow-y-auto py-8 px-4 scrollbar-hide print:py-0 print:px-0 print:justify-start"
            >
              {/* Receipt card */}
              <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl print:shadow-none print:rounded-none print:max-w-none">

                {/* Brand header */}
                <div className="text-center pt-8 pb-6 px-6 border-b border-dashed border-zinc-200">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Scissors size={18} className="text-terra-500" />
                    <span className="text-2xl font-black tracking-tight text-[#3D5151]">cafuné</span>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                    Comprobante de atención
                  </p>
                </div>

                {/* Sale info */}
                <div className="px-6 py-5 border-b border-dashed border-zinc-200 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Fecha</span>
                    <span className="font-medium">{formatDate(completedAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Forma de pago</span>
                    <span className="font-semibold">{PAYMENT_LABEL[paymentMethod]}</span>
                  </div>
                  {activeWorker && (
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Atendido por</span>
                      <span className="font-medium">{activeWorker.full_name}</span>
                    </div>
                  )}
                </div>

                {/* Services */}
                {posServices.length > 0 && (
                  <div className="px-6 py-5 border-b border-dashed border-zinc-200">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-3">Servicios</p>
                    <div className="space-y-3">
                      {optServices.map(s => (
                        <div key={s.id}>
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-[#3D5151]">{s.service_name}</span>
                            <span className="tabular-nums font-semibold">{formatCurrency(s.price_charged)}</span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5">→ {s.worker_name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Products */}
                {optProducts.length > 0 && (
                  <div className="px-6 py-5 border-b border-dashed border-zinc-200">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-3">Productos</p>
                    <div className="space-y-2">
                      {optProducts.map(p => (
                        <div key={p.id} className="flex justify-between text-sm">
                          <span className="font-medium text-[#3D5151]">
                            {p.product_name}
                            {p.quantity > 1 && <span className="text-zinc-400 ml-1">×{p.quantity}</span>}
                          </span>
                          <span className="tabular-nums font-semibold">{formatCurrency(p.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="px-6 py-5 border-b border-dashed border-zinc-200">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-black uppercase tracking-wider text-[#3D5151]">Total</span>
                    <span className="text-2xl font-black tabular-nums text-terra-500">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>

                {/* QR + Footer */}
                <div className="flex flex-col items-center pt-4 pb-6 px-6 gap-3">
                  {receiptId && <ReceiptQrCode receiptId={receiptId} />}
                  <p className="text-xs text-zinc-400">¡Gracias por tu visita!</p>
                  <p className="text-[10px] text-zinc-300">cafuné · espacio de cuidado personal</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3 mt-6 w-full max-w-sm print:hidden">
                {receiptId && (
                  <ReceiptEmailSender
                    action={(email) => sendReceiptEmail(receiptId, email)}
                  />
                )}
                <div className="flex gap-3">
                  <motion.button
                    onClick={() => window.print()}
                    whileTap={{ scale: 0.95 }}
                    transition={SPRING}
                    className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-zinc-200 text-zinc-600 font-bold text-sm hover:border-zinc-300 transition-colors"
                  >
                    <Printer size={18} /> Imprimir
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      const prev = document.title
                      if (receiptId) document.title = `cafune-boleta-${receiptId.slice(0, 8).toUpperCase()}`
                      window.print()
                      setTimeout(() => { document.title = prev }, 500)
                    }}
                    whileTap={{ scale: 0.95 }}
                    transition={SPRING}
                    className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#3D5151] text-white font-bold text-sm hover:bg-[#2e3d3d] transition-colors"
                  >
                    <Download size={18} /> Descargar PDF
                  </motion.button>
                </div>
                <motion.button
                  onClick={handleNewSale}
                  whileTap={{ scale: 0.95 }}
                  transition={SPRING}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-rose-900 text-white rounded-2xl font-bold text-sm hover:bg-rose-800 shadow-lg shadow-rose-900/15"
                >
                  <RotateCcw size={18} /> Nueva venta
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Mobile catalog FAB — only in selling phase ── */}
      <AnimatePresence>
        {phase === 'selling' && (
          <motion.button
            key="mob-fab"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={SPRING}
            onClick={() => setShowMobileCatalog(true)}
            whileTap={{ scale: 0.88 }}
            className="md:hidden fixed bottom-24 right-4 z-30 w-14 h-14 bg-rose-900 text-white rounded-2xl shadow-xl shadow-rose-900/25 flex items-center justify-center"
          >
            <Plus size={26} strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Mobile catalog bottom sheet ── */}
      <div className="md:hidden">
        <BottomSheet
          open={showMobileCatalog}
          onClose={() => { setShowMobileCatalog(false); setScanError(null) }}
          title="Agregar"
          maxHeight="90vh"
        >
          <div className="px-5 pb-8 space-y-4">
            {/* Tabs */}
            <div className="flex gap-2">
              {(['service', 'product'] as const).map(tab => (
                <motion.button
                  key={tab}
                  onClick={() => { setCatalogTab(tab); setCatalogQuery('') }}
                  whileTap={{ scale: 0.96 }}
                  transition={SPRING}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${
                    catalogTab === tab
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                      : 'bg-zinc-100 text-zinc-500'
                  }`}
                >
                  {tab === 'service'
                    ? <><Scissors size={14} strokeWidth={2} /> Servicios</>
                    : <><ShoppingBag size={14} /> Productos</>}
                </motion.button>
              ))}
            </div>

            {/* Search */}
            <SearchInput
              value={catalogQuery}
              onChange={q => { setCatalogQuery(q); setSelectedServiceId(null) }}
              placeholder={catalogTab === 'service' ? 'Buscar servicio…' : 'Buscar producto…'}
            />

            {/* ─ Services ─ */}
            {catalogTab === 'service' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {services.filter(s =>
                    !catalogQuery || s.name.toLowerCase().includes(catalogQuery.toLowerCase())
                  ).map(svc => (
                    <motion.button
                      key={svc.id}
                      onClick={() => setSelectedServiceId(svc.id === selectedServiceId ? null : svc.id)}
                      whileTap={{ scale: 0.93 }}
                      animate={{ scale: svc.id === selectedServiceId ? 1.03 : 1 }}
                      transition={SPRING}
                      className={`text-left p-4 rounded-2xl border-2 transition-colors ${
                        svc.id === selectedServiceId
                          ? 'border-rose-500 bg-rose-50 shadow-md shadow-rose-500/10'
                          : 'border-zinc-200 bg-white'
                      }`}
                    >
                      <p className="text-sm font-bold text-[#3D5151] leading-snug">{svc.name}</p>
                      <p className="text-xs font-bold text-terra-500 mt-1.5 tabular-nums">{formatCurrency(svc.base_price)}</p>
                    </motion.button>
                  ))}
                </div>

                <AnimatePresence>
                  {selectedService && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 12 }}
                      transition={SPRING}
                      className="space-y-3"
                    >
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Trabajadora</p>
                      <div className="flex flex-wrap gap-2">
                        {workers.map(w => (
                          <motion.button
                            key={w.id}
                            onClick={() => setSelectedWorkerId(w.id === selectedWorkerId ? null : w.id)}
                            whileTap={{ scale: 0.91 }}
                            animate={{ scale: w.id === selectedWorkerId ? 1.05 : 1 }}
                            transition={SPRING}
                            className={`px-3.5 py-2 rounded-xl text-sm font-bold border-2 transition-colors ${
                              w.id === selectedWorkerId
                                ? 'border-rose-500 bg-rose-600 text-white shadow-md shadow-rose-600/20'
                                : 'border-zinc-200 bg-zinc-50 text-zinc-600'
                            }`}
                          >
                            {w.full_name.split(' ')[0]}
                          </motion.button>
                        ))}
                      </div>
                      <motion.button
                        onClick={() => { handleAddService(); setShowMobileCatalog(false) }}
                        disabled={!selectedWorkerId || isPending}
                        whileTap={{ scale: 0.96 }}
                        transition={SPRING}
                        className="w-full py-5 bg-rose-900 text-white rounded-2xl text-base font-black disabled:opacity-40 flex items-center justify-center gap-2.5 shadow-lg shadow-rose-900/15"
                      >
                        <Plus size={20} strokeWidth={2.5} />
                        Agregar — {formatCurrency(selectedService.base_price)}
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ─ Products ─ */}
            {catalogTab === 'product' && (
              <div className="space-y-4">
                <motion.button
                  onClick={() => setShowScanner(true)}
                  whileTap={{ scale: 0.95 }}
                  transition={SPRING}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-zinc-200 bg-white text-sm font-bold text-zinc-600 hover:border-rose-400 hover:text-rose-600 transition-colors w-full justify-center"
                >
                  <Scan size={16} /> Escanear código de barras
                </motion.button>

                <div className="grid grid-cols-2 gap-3">
                  {products.filter(p =>
                    !catalogQuery ||
                    p.name.toLowerCase().includes(catalogQuery.toLowerCase()) ||
                    (p.barcode ?? '').includes(catalogQuery)
                  ).map(prd => (
                    <motion.button
                      key={prd.id}
                      onClick={() => { handleAddProduct(prd.id); setShowMobileCatalog(false) }}
                      whileTap={{ scale: 0.91 }}
                      transition={SPRING}
                      className="text-left p-4 rounded-2xl border-2 border-zinc-200 bg-white hover:border-rose-300 hover:bg-rose-50 active:border-rose-500 transition-colors"
                    >
                      <p className="text-sm font-bold text-[#3D5151] leading-snug">{prd.name}</p>
                      <p className="text-xs font-bold text-terra-500 mt-1.5 tabular-nums">{formatCurrency(prd.price)}</p>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </BottomSheet>
      </div>

      {/* ── Barcode scanner overlay ── */}
      <AnimatePresence>
        {showScanner && (
          <BarcodeScanner
            onScan={handleScan}
            onClose={() => setShowScanner(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Payment method modal ── */}
      <AnimatePresence>
        {phase === 'paying' && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 print:hidden"
              onClick={() => setPhase('selling')}
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              exit={{ opacity: 0,    y: 40, scale: 0.96 }}
              transition={SPRING}
              className="fixed inset-x-4 bottom-24 md:inset-x-auto md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-96 bg-white rounded-3xl shadow-2xl z-50 p-6 print:hidden"
            >
              <h3 className="text-xl font-black text-[#3D5151] mb-1">Forma de pago</h3>
              <p className="text-sm text-zinc-400 mb-5">
                Total: <strong className="text-[#3D5151] tabular-nums">{formatCurrency(totalAmount)}</strong>
              </p>
              <div className="grid grid-cols-2 gap-3">
                {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                  <motion.button
                    key={value}
                    onClick={() => handleConfirmPayment(value as PaymentMethod)}
                    disabled={isPending}
                    whileTap={{ scale: 0.93 }}
                    transition={SPRING}
                    className="flex flex-col items-center gap-2.5 py-5 rounded-2xl border-2 border-zinc-200 bg-zinc-50 hover:border-rose-400 hover:bg-rose-50 transition-colors disabled:opacity-50"
                  >
                    {isPending
                      ? <Spinner size={24} />
                      : <Icon size={26} className="text-zinc-600" strokeWidth={1.8} />
                    }
                    <span className="text-sm font-bold text-zinc-700">{label}</span>
                  </motion.button>
                ))}
              </div>
              <motion.button
                onClick={() => setPhase('selling')}
                whileTap={{ scale: 0.97 }}
                transition={SPRING}
                className="w-full mt-4 py-3 text-sm font-bold text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                Cancelar
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
