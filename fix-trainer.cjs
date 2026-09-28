const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const target = `{['Couple', 'Group'].includes(v.sessionType) && field('holdersCount', 'Jumlah Pemegang Roster', 'number')}
        </div>

        {['Couple', 'Group'].includes(v.sessionType) && (
          <>
            <div className="sub-heading">
              <h3>Tabel Tier Harga &amp; Komisi Trainer</h3>
              <button type="button" className="secondary" onClick={() => upd('tiers', [...(v.tiers || []), { id: uid(), holders: 2, price: 0, commission: 0 }])}><Plus size={14} />Tambah Tier</button>
            </div>
            <div className="table-scroll" style={{border: '1px solid #edf0f0', borderRadius: '6px', marginBottom: '15px'}}>
              <table>
                <thead style={{position: 'sticky', top: 0, zIndex: 1}}>
                  <tr>
                    <th>Jml Pemegang (Group)</th>
                    <th>Harga Paket (Rp)</th>
                    <th>Komisi Trainer per Sesi (Rp)</th>
                    <th style={{width: '50px'}}></th>
                  </tr>
                </thead>
                <tbody>
                  {(v.tiers || []).map((t, i) => (
                    <tr key={t.id}>
                      <td><input type="number" value={t.holders} onChange={e => { const n=[...v.tiers]; n[i].holders=Number(e.target.value); upd('tiers', n); }} style={{width: '100px', margin: 0}} /></td>
                      <td>
                        <div className="currency-wrapper" style={{minHeight: '32px'}}>
                          <span className="prefix" style={{padding: '0 8px', fontSize: '12px'}}>Rp</span>
                          <input type="text" value={t.price ? t.price.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ".") : ''} onChange={e => { const raw=e.target.value.replace(/\\D/g,''); const n=[...v.tiers]; n[i].price=raw?Number(raw):0; upd('tiers', n); }} style={{border:'none',boxShadow:'none',outline:'none',minHeight:0,padding:'0 8px'}} />
                        </div>
                      </td>
                      <td>
                        <div className="currency-wrapper" style={{minHeight: '32px'}}>
                          <span className="prefix" style={{padding: '0 8px', fontSize: '12px'}}>Rp</span>
                          <input type="text" value={t.commission ? t.commission.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ".") : ''} onChange={e => { const raw=e.target.value.replace(/\\D/g,''); const n=[...v.tiers]; n[i].commission=raw?Number(raw):0; upd('tiers', n); }} style={{border:'none',boxShadow:'none',outline:'none',minHeight:0,padding:'0 8px'}} />
                        </div>
                      </td>
                      <td style={{textAlign: 'center'}}><button type="button" className="delete-action" onClick={() => upd('tiers', v.tiers.filter((_, idx) => idx !== i))} style={{padding: '5px'}}><Trash2 size={15} /></button></td>
                    </tr>
                  ))}
                  {!(v.tiers || []).length && <tr><td colSpan="4" style={{textAlign: 'center', color: '#999'}}>Belum ada tier. Klik Tambah Tier.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="simulation" style={{marginBottom: '15px'}}><p><i>Aturan: 1 Pembayar. Billing terpusat. Kuota sesi dipotong kolektif tiap kali 1 pertemuan grup/couple diadakan. Roster anggota dikunci permanen saat transaksi POS.</i></p></div>
          </>
        )}`;

const replacement = `{v.sessionType === 'Couple' && field('holdersCount', 'Jumlah Pemegang (Otomatis 2)', 'number', [], false, true)}
          {v.sessionType === 'Group' && field('holdersCount', 'Jumlah Pemegang (2/4/6)', 'number')}
        </div>

        {['Couple', 'Group'].includes(v.sessionType) && (
          <>
            <div className="sub-heading">
              <h3>Tabel Tier Harga</h3>
              <button type="button" className="secondary" onClick={() => upd('priceTiers', [...(v.priceTiers || []), { id: uid(), holders: 2, price: 0 }])}><Plus size={14} />Tambah Tier</button>
            </div>
            <div className="table-scroll" style={{border: '1px solid #edf0f0', borderRadius: '6px', marginBottom: '15px'}}>
              <table>
                <thead style={{position: 'sticky', top: 0, zIndex: 1}}>
                  <tr>
                    <th>Jml Pemegang (Group)</th>
                    <th>Harga Paket (Rp)</th>
                    <th style={{width: '50px'}}></th>
                  </tr>
                </thead>
                <tbody>
                  {(v.priceTiers || []).map((t, i) => (
                    <tr key={t.id}>
                      <td><input type="number" value={t.holders} onChange={e => { const n=[...v.priceTiers]; n[i].holders=Number(e.target.value); upd('priceTiers', n); }} style={{width: '100px', margin: 0}} /></td>
                      <td>
                        <div className="currency-wrapper" style={{minHeight: '32px'}}>
                          <span className="prefix" style={{padding: '0 8px', fontSize: '12px'}}>Rp</span>
                          <input type="text" value={t.price ? t.price.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ".") : ''} onChange={e => { const raw=e.target.value.replace(/\\D/g,''); const n=[...v.priceTiers]; n[i].price=raw?Number(raw):0; upd('priceTiers', n); }} style={{border:'none',boxShadow:'none',outline:'none',minHeight:0,padding:'0 8px'}} />
                        </div>
                      </td>
                      <td style={{textAlign: 'center'}}><button type="button" className="delete-action" onClick={() => upd('priceTiers', v.priceTiers.filter((_, idx) => idx !== i))} style={{padding: '5px'}}><Trash2 size={15} /></button></td>
                    </tr>
                  ))}
                  {!(v.priceTiers || []).length && <tr><td colSpan="3" style={{textAlign: 'center', color: '#999'}}>Belum ada tier harga. Klik Tambah Tier.</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="sub-heading">
              <h3>Tabel Komisi per Tier</h3>
              <button type="button" className="secondary" onClick={() => upd('commissionTiers', [...(v.commissionTiers || []), { id: uid(), holders: 2, commission: 0 }])}><Plus size={14} />Tambah Tier</button>
            </div>
            <div className="table-scroll" style={{border: '1px solid #edf0f0', borderRadius: '6px', marginBottom: '15px'}}>
              <table>
                <thead style={{position: 'sticky', top: 0, zIndex: 1}}>
                  <tr>
                    <th>Jml Pemegang (Group)</th>
                    <th>Komisi Trainer per Sesi (Rp)</th>
                    <th style={{width: '50px'}}></th>
                  </tr>
                </thead>
                <tbody>
                  {(v.commissionTiers || []).map((t, i) => (
                    <tr key={t.id}>
                      <td><input type="number" value={t.holders} onChange={e => { const n=[...v.commissionTiers]; n[i].holders=Number(e.target.value); upd('commissionTiers', n); }} style={{width: '100px', margin: 0}} /></td>
                      <td>
                        <div className="currency-wrapper" style={{minHeight: '32px'}}>
                          <span className="prefix" style={{padding: '0 8px', fontSize: '12px'}}>Rp</span>
                          <input type="text" value={t.commission ? t.commission.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ".") : ''} onChange={e => { const raw=e.target.value.replace(/\\D/g,''); const n=[...v.commissionTiers]; n[i].commission=raw?Number(raw):0; upd('commissionTiers', n); }} style={{border:'none',boxShadow:'none',outline:'none',minHeight:0,padding:'0 8px'}} />
                        </div>
                      </td>
                      <td style={{textAlign: 'center'}}><button type="button" className="delete-action" onClick={() => upd('commissionTiers', v.commissionTiers.filter((_, idx) => idx !== i))} style={{padding: '5px'}}><Trash2 size={15} /></button></td>
                    </tr>
                  ))}
                  {!(v.commissionTiers || []).length && <tr><td colSpan="3" style={{textAlign: 'center', color: '#999'}}>Belum ada tier komisi. Klik Tambah Tier.</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="simulation" style={{marginBottom: '15px'}}><p><i>Aturan: 1 Pembayar. Billing terpusat. Kuota sesi dipotong kolektif tiap kali 1 pertemuan grup/couple diadakan. Roster anggota dikunci permanen saat transaksi POS.</i></p></div>
          </>
        )}`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/App.jsx', code);
  console.log("Success");
} else {
  console.log("Target not found!");
}
