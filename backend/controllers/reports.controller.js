// backend/controllers/reports.controller.js
// Controller สำหรับจัดการรายงานสรุป (Reports)
const reportsRepo = require('../repositories/reports.repository');

// GET /api/reports/individual/:evaluateeId/:assignmentId (เปลี่ยน periodId → assignmentId)
// สรุปผลการประเมินรายบุคคล
exports.getIndividualSummary = async (req, res, next) => {
  try {
    const { evaluateeId, assignmentId } = req.params;
    
    // เรียกข้อมูลจาก repository
    const data = await reportsRepo.getIndividualSummary(evaluateeId, assignmentId);
    
    if (!data) {
      return res.status(404).json({ 
        success: false, 
        message: 'No data found for this evaluatee and assignment' 
      });
    }
    
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

// GET /api/reports/overall/:assignmentId (เปลี่ยน periodId → assignmentId)
// สรุปภาพรวมทั้งหมดใน assignment
exports.getOverallSummary = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    
    // เรียกข้อมูลรายการทั้งหมด
    const items = await reportsRepo.getOverallSummary(assignmentId);
    
    res.json({ 
      success: true, 
      items, 
      total: items.length 
    });
  } catch (e) {
    next(e);
  }
};

// GET /api/reports/topics/:assignmentId (เปลี่ยน periodId → assignmentId)
// สรุปคะแนนตามหัวข้อประเมิน
exports.getTopicSummary = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    
    const items = await reportsRepo.getTopicSummary(assignmentId);
    
    res.json({ 
      success: true, 
      items, 
      total: items.length 
    });
  } catch (e) {
    next(e);
  }
};

// GET /api/reports/export-pdf/:evaluateeId/:assignmentId (เปลี่ยน periodId → assignmentId)
// Export PDF สำหรับรายงานรายบุคคล
// TODO: ใช้ PDFKit หรือ Puppeteer สร้าง PDF จริง
exports.exportPDF = async (req, res, next) => {
  try {
    const { evaluateeId, assignmentId } = req.params;
    
    // ดึงข้อมูลสำหรับ export
    const data = await reportsRepo.getExportData(evaluateeId, assignmentId);
    
    if (!data) {
      return res.status(404).json({ 
        success: false, 
        message: 'No data found for export' 
      });
    }
    
    // TODO: ในอนาคตจะใช้ PDFKit หรือ Puppeteer สร้าง PDF จริง
    // ตอนนี้ส่งข้อมูล JSON กลับไปก่อน เพื่อให้ Frontend นำไปใช้
    
    // *** ตัวอย่างการสร้าง PDF (ยังไม่ใช้งาน) ***
    // const PDFDocument = require('pdfkit');
    // const doc = new PDFDocument();
    // res.setHeader('Content-Type', 'application/pdf');
    // res.setHeader('Content-Disposition', `attachment; filename=report-${evaluateeId}-${assignmentId}.pdf`);
    // doc.pipe(res);
    // doc.text('รายงานการประเมิน', { align: 'center' });
    // doc.end();
    
    // ส่งข้อมูล JSON ก่อน (ให้ Frontend จัดการ)
    res.json({ 
      success: true, 
      data,
      message: 'Export data ready (PDF generation not implemented yet)' 
    });
  } catch (e) {
    next(e);
  }
};