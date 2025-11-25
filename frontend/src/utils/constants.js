export const EVALUATION_STATUS = {
  draft: {
    text: 'ร่าง',
    color: 'grey',
    icon: 'mdi-pencil',
    description: 'ยังไม่ส่ง'
  },
  submitted: {
    text: 'ส่งแล้ว',
    color: 'blue',
    icon: 'mdi-send',
    description: 'รอการประเมิน'
  },
  evaluated: {
    text: 'ประเมินแล้ว',
    color: 'orange',
    icon: 'mdi-star',
    description: 'รอการอนุมัติ'
  },
  approved: {
    text: 'อนุมัติแล้ว',
    color: 'green',
    icon: 'mdi-check-circle',
    description: 'เสร็จสิ้น'
  }
};

export const EVALUATION_TYPES = {
  binary: {
    name: 'มี/ไม่มี',
    description: 'ประเมินแบบมีหรือไม่มี'
  },
  scale_1_4: {
    name: 'สเกล 1-4',
    description: 'ประเมินแบบ 4 ระดับ'
  },
  custom: {
    name: 'กำหนดเอง',
    description: 'ตัวเลือกที่กำหนดเอง'
  }
};

export const USER_ROLES = {
  admin: {
    name: 'ผู้ดูแลระบบ',
    color: 'purple',
    icon: 'mdi-account-tie'
  },
  evaluatee: {
    name: 'ผู้รับการประเมิน',
    color: 'blue',
    icon: 'mdi-account'
  },
  evaluator: {
    name: 'กรรมการ',
    color: 'orange',
    icon: 'mdi-account-star'
  }
};

export const EVIDENCE_TYPES = {
  pdf: {
    name: 'PDF',
    accept: 'application/pdf',
    icon: 'mdi-file-pdf'
  },
  image: {
    name: 'รูปภาพ',
    accept: 'image/jpeg,image/png,image/jpg',
    icon: 'mdi-image'
  },
  url: {
    name: 'URL',
    icon: 'mdi-link'
  },
  text: {
    name: 'ข้อความ',
    icon: 'mdi-text'
  }
};

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_FILES_PER_UPLOAD = 5;
