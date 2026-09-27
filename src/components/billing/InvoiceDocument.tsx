import type { BillDetail, InvoiceLayout, Purchase } from '@/types';
import { inrInWords } from '@/lib/numberToWords';
import './invoice-document.css';

const money = (value: string | number | null | undefined) => Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qty = (value: string | number) => Number(value).toLocaleString('en-IN', { maximumFractionDigits: 3 });
const date = (value?: string) => value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '';
const balanceText = (value: number) => `₹ ${money(Math.abs(value))} ${value < 0 ? 'Cr' : 'Dr'}`;

export function purchaseAsBill(data: Purchase): BillDetail {
  return {
    id: data.id, bill_number: data.order_number || data.invoice_number || data.id.slice(0, 8).toUpperCase(), bill_date: data.purchase_date,
    bill_type: data.gst_enabled ? 'gst' : 'non_gst', party_id: data.party_id, party: null, shop: data.shop || null,
    customer_name: data.party?.name || '', customer_mobile: data.party?.mobile || null, customer_address: data.party?.address || null, customer_gstin: data.party?.gstin || null,
    document_details: data.document_details, subtotal: data.subtotal || data.total_amount, cgst_total: data.cgst_total || '0', sgst_total: data.sgst_total || '0',
    discount_amount: '0', round_off: '0', previous_balance: '0', grand_total: data.total_amount, paid_amount: data.paid_amount, payment_mode: data.payment_mode,
    payment_status: data.payment_status, status: 'active', notes: data.notes, cancelled_at: null, cancellation_reason: null, pdf_url: null, created_at: data.created_at, updated_at: data.created_at,
    payments: [], items: (data.items || []).map(item => ({ ...item, bill_id: data.id, product_name: item.product_name || item.product?.name || '', unit: item.unit || item.product?.unit || '', hsn_code: item.hsn_code || null, gst_rate: item.gst_rate || '0', taxable_amount: item.taxable_amount || item.total_amount, cgst_amount: item.cgst_amount || '0', sgst_amount: item.sgst_amount || '0' })),
  };
}

export function InvoiceDocument({ data, layout = 'uniwest', kind = 'bill' }: { data: BillDetail; layout?: InvoiceLayout; kind?: 'bill' | 'purchase' | 'purchase_order' }) {
  const shop = data.shop;
  const details = data.document_details || {};
  const gst = data.bill_type === 'gst';
  const order = kind === 'purchase_order';
  const title = order ? 'PURCHASE ORDER' : kind === 'purchase' ? 'PURCHASE RECORD' : gst ? (layout === 'uniwest' ? 'GST TAX INVOICE' : 'TAX INVOICE') : 'CASH MEMO';
  const buyer = data.customer_name || data.party?.name || 'Walk-in customer';
  const buyerAddress = data.customer_address || data.party?.address || '';
  const buyerGstin = data.customer_gstin || data.party?.gstin || '';
  const buyerPhone = data.customer_mobile || data.party?.mobile || '';
  const shopAddress = [shop?.address, [shop?.city, shop?.state, shop?.pin].filter(Boolean).join(', ')].filter(Boolean).join('\n');
  const shipName = details.shipping_name || (kind === 'bill' ? buyer : shop?.name);
  const shipAddress = details.shipping_address || (kind === 'bill' ? buyerAddress : shopAddress);
  const shipGstin = details.shipping_gstin || (kind === 'bill' ? buyerGstin : shop?.gstin);
  const totals = new Map<string, number>();
  const taxGroups = new Map<string, { hsn: string; rate: number; taxable: number; cgst: number; sgst: number }>();
  for (const item of data.items) {
    const unit = item.unit.trim().toLowerCase();
    totals.set(unit, (totals.get(unit) || 0) + Number(item.quantity));
    const key = `${item.hsn_code || '-'}:${Number(item.gst_rate)}`;
    const group = taxGroups.get(key) || { hsn: item.hsn_code || '-', rate: Number(item.gst_rate), taxable: 0, cgst: 0, sgst: 0 };
    group.taxable += Number(item.taxable_amount); group.cgst += Number(item.cgst_amount); group.sgst += Number(item.sgst_amount);
    taxGroups.set(key, group);
  }
  const quantities = [...totals].map(([unit, value]) => `${qty(value)} ${unit.toUpperCase()}`).join(' · ');
  const previous = Number(data.previous_balance || 0);
  const current = previous + Math.max(0, Number(data.grand_total) - Number(data.paid_amount));
  const label = kind === 'bill' ? 'Buyer (Bill to)' : 'Supplier (To)';
  const referenceRows: Array<[string, string | undefined | null]> = [
    [order ? 'Order No.' : 'Invoice No.', data.bill_number], ['Dated', date(data.bill_date)],
    ['Delivery Note', details.delivery_note], ['Delivery Note Date', date(details.delivery_note_date)],
    ['Dispatch Doc No.', details.dispatch_doc_no], ['GR / RR No.', details.gr_rr_no],
    ['Dispatched through', details.dispatched_through], ['Destination', details.destination],
    ['Vehicle No.', details.vehicle_number], ['Station', details.station],
    ['Place of Supply', details.place_of_supply || shop?.state], ['Reverse Charge', details.reverse_charge ? 'Y' : 'N'],
  ];
  const partyBlock = <div className="invoice-party"><em><strong>{layout === 'tejas' ? 'Billed to :' : label}</strong></em><strong>{buyer}</strong><div className="pre-line">{buyerAddress}</div>{buyerPhone && <div>MOB: {buyerPhone}</div>}<div className="party-gstin">GSTIN / UIN : <strong>{buyerGstin}</strong></div><div>State Name : {details.place_of_supply || shop?.state || ''}{(details.state_code || shop?.state_code) && `, Code : ${details.state_code || shop?.state_code}`}</div></div>;
  const shippingBlock = <div className="invoice-party"><em><strong>Shipped to :</strong></em><strong>{shipName}</strong><div className="pre-line">{shipAddress}</div>{details.shipping_mobile && <div>MOB: {details.shipping_mobile}</div>}<div className="party-gstin">GSTIN / UIN : <strong>{shipGstin}</strong></div>{details.shipping_state && <div>State : {details.shipping_state}, Code : {details.shipping_state_code}</div>}</div>;
  const columns = layout === 'tejas' ? 9 : 8;
  return <article className={`bill-page invoice-document ${layout}`}>
    {layout === 'uniwest' && <h1 className="document-title">{title}</h1>}
    <div className="invoice-frame">
      {layout === 'uniwest' ? <div className="uniwest-heading">
        <div className="uniwest-parties"><div className="invoice-seller"><div className="seller-brand">{shop?.logo_url && <img src={shop.logo_url} alt="Shop logo" />}<div><strong>{shop?.name || 'Agromart'}</strong><div className="pre-line">{shopAddress}</div>{shop?.phone && <div>Contact No. {shop.phone}</div>}{gst && <div>GSTIN/UIN: {shop?.gstin || ''}</div>}{shop?.pan && <div>PAN/IT No.: {shop.pan}</div>}<div>State Name : {shop?.state || ''}, Code : {shop?.state_code || ''}</div>{shop?.email && <div>E-mail: {shop.email}</div>}</div></div></div>{partyBlock}</div>
        <div className="invoice-references">{referenceRows.map(([name, value]) => <div key={name}><span>{name}</span><strong>{value || '\u00a0'}</strong></div>)}<div className="reference-wide"><span>Terms of Delivery</span><strong>{details.terms_of_delivery || '\u00a0'}</strong></div><div className="reference-wide"><span>{details.copy_label || 'Original Copy'}</span></div></div>
      </div> : <>
        <header className="tejas-heading"><span className="seller-gstin">{gst ? `GSTIN : ${shop?.gstin || ''}` : ''}</span><em className="copy-label">{details.copy_label || 'Original Copy'}</em><h1>{title}</h1><h2>{shop?.name || 'Agromart'}</h2><div className="pre-line">{shopAddress}</div>{shop?.pan && <div>PAN : {shop.pan}</div>}<strong><em>{shop?.phone && `Tel. : ${shop.phone}`} {shop?.email && ` email : ${shop.email}`}</em></strong></header>
        <div className="tejas-references"><div>{referenceRows.filter((_, index) => [0, 1, 10, 11].includes(index)).map(([name, value]) => <div className="reference-line" key={name}><span>{name}</span><span>: {value}</span></div>)}</div><div>{referenceRows.filter((_, index) => [5, 6, 8, 9].includes(index)).map(([name, value]) => <div className="reference-line" key={name}><span>{name}</span><span>: {value}</span></div>)}</div></div>
        <div className="tejas-parties">{partyBlock}{shippingBlock}</div>
      </>}
      {layout === 'uniwest' && details.shipping_name && <div className="extra-shipping">{shippingBlock}</div>}
      <table className="invoice-items"><colgroup>{(layout === 'tejas' ? [4, 27, 8, 9, 5, 10, 9, 10, 18] : [4, 36, 10, 12, 10, 6, 7, 15]).map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup>
        <thead><tr><th>Sl<br />No.</th><th>Description of Goods</th><th>HSN/SAC{layout === 'tejas' && <><br />Code</>}</th><th>Quantity</th>{layout === 'tejas' && <th>Unit</th>}<th>{layout === 'tejas' ? 'List Price' : 'Rate'}</th><th>{layout === 'tejas' ? 'Discount' : 'per'}</th><th>{layout === 'tejas' ? 'Price' : 'Disc. %'}</th><th>Amount(₹)</th></tr></thead>
        <tbody>{data.items.map((item, index) => <tr className="item-line" key={item.id}><td>{index + 1}</td><td><strong>{item.product_name}{item.pack_label && ` (${item.pack_label.toUpperCase()}${item.units_per_pack ? ` X ${item.units_per_pack}` : ''})`}</strong>{item.packing_type && <div className="small-text">{layout === 'tejas' && Number(item.pack_count || 0) > 0 ? `${qty(item.pack_count!)} ${item.packing_type}` : item.packing_type}</div>}</td><td>{item.hsn_code || ''}</td><td className="number"><strong>{qty(item.quantity)}{layout === 'uniwest' && ` ${item.unit.toUpperCase()}`}</strong>{layout === 'uniwest' && item.pack_count != null && Number(item.pack_count) > 0 && <div><em>({qty(item.pack_count)} {item.packing_type || 'PACK'})</em></div>}</td>{layout === 'tejas' && <td>{item.unit}</td>}<td className="number">{money(layout === 'tejas' ? item.list_price : item.rate)}</td><td className={layout === 'tejas' ? 'number' : ''}>{layout === 'tejas' ? `${money(item.discount_percent)} %` : item.unit.toUpperCase()}</td><td className="number">{layout === 'tejas' ? money(item.rate) : Number(item.discount_percent || 0) ? money(item.discount_percent) : ''}</td><td className="number">{money(item.taxable_amount)}</td></tr>)}
          <tr className="invoice-spacer" style={{ height: `${Math.max(8, 50 - data.items.length * 6)}mm` }}>{Array.from({ length: columns }, (_, i) => <td key={i} />)}</tr>
          <tr className="tax-line"><td /><td /><td colSpan={columns - 3} /><td className="number">{money(data.subtotal)}</td></tr>
          {gst && <><tr className="tax-line"><td /><td className="number"><strong><em>CGST</em></strong></td><td colSpan={columns - 3} /><td className="number">{money(data.cgst_total)}</td></tr><tr className="tax-line"><td /><td className="number"><strong><em>SGST</em></strong></td><td colSpan={columns - 3} /><td className="number">{money(data.sgst_total)}</td></tr></>}
          {Number(data.discount_amount) > 0 && <tr className="tax-line"><td /><td className="number"><strong>DISCOUNT</strong></td><td colSpan={columns - 3} /><td className="number">−{money(data.discount_amount)}</td></tr>}
          {Number(data.round_off || 0) !== 0 && <tr className="tax-line"><td /><td className="number"><strong><em>ROUND OFF</em></strong></td><td colSpan={columns - 3} /><td className="number">{money(data.round_off)}</td></tr>}
        </tbody>
        <tfoot><tr><td /><td className="number"><strong>Total</strong></td><td /><td colSpan={columns - 4} className="number"><strong>{quantities}</strong></td><td className="number"><strong>₹ {money(data.grand_total)}</strong></td></tr></tfoot>
      </table>
      <div className="amount-words"><div><span>Amount Chargeable (in words)</span><strong>{inrInWords(Number(data.grand_total))}</strong></div><div className="balances"><em>E. & O. E.</em>{kind === 'bill' && layout === 'uniwest' && <><div><span>Previous Balance</span><strong>{balanceText(previous)}</strong></div><div><span>Current Balance</span><strong>{balanceText(current)}</strong></div></>}</div></div>
      {gst && <><table className="tax-summary"><thead><tr><th rowSpan={2}>HSN/SAC</th><th rowSpan={2}>Taxable<br />Value</th><th colSpan={2}>CGST</th><th colSpan={2}>SGST/UTGST</th><th rowSpan={2}>Total<br />Tax Amount</th></tr><tr><th>Rate</th><th>Amount</th><th>Rate</th><th>Amount</th></tr></thead><tbody>{[...taxGroups].map(([key, group]) => <tr key={key}><td>{group.hsn}</td><td className="number">{money(group.taxable)}</td><td className="number">{group.rate / 2}%</td><td className="number">{money(group.cgst)}</td><td className="number">{group.rate / 2}%</td><td className="number">{money(group.sgst)}</td><td className="number">{money(group.cgst + group.sgst)}</td></tr>)}<tr><th>Total</th><th className="number">{money([...taxGroups.values()].reduce((sum, g) => sum + g.taxable, 0))}</th><td /><th className="number">{money(data.cgst_total)}</th><td /><th className="number">{money(data.sgst_total)}</th><th className="number">{money(Number(data.cgst_total) + Number(data.sgst_total))}</th></tr></tbody></table><div className="tax-words">Tax Amount (in words) : <strong>{inrInWords(Number(data.cgst_total) + Number(data.sgst_total))}</strong></div></>}
      {data.notes && <div className="document-notes"><strong>Notes: </strong>{data.notes}</div>}
      <footer className="invoice-footer"><div>{shop?.show_terms && shop.bill_terms && <div className="terms"><strong><u>Terms & Conditions</u></strong><div className="pre-line">{shop.bill_terms}</div></div>}<div className="declaration"><u>{order ? 'Terms of delivery' : 'Declaration'}</u><div>{order ? details.terms_of_delivery : shop?.declaration || 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.'}</div></div></div><div className="signature-bank">{shop?.show_bank_details && <div><strong>Company’s Bank Details</strong><div>Bank Name : <strong>{shop.bank_name}</strong></div><div>A/c No. : <strong>{shop.bank_account}</strong></div><div>Branch & IFSC Code : <strong>{shop.bank_branch} {shop.bank_ifsc}</strong></div></div>}<div className="signature"><strong>for {shop?.name || 'Agromart'}</strong>{layout === 'tejas' && <span className="receiver-signature">Receiver’s Signature :</span>}{shop?.show_signature_line !== false && <strong>Authorised Signatory</strong>}</div></div></footer>
    </div>
    <div className="computer-generated">{(gst ? shop?.footer_message_gst : shop?.footer_message_non_gst) || `This is a Computer Generated ${order ? 'Purchase Order' : 'Invoice'}`}</div>
  </article>;
}
