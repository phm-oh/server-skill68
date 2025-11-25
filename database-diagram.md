# Database ER Diagram

แผนภาพความสัมพันธ์ของฐานข้อมูล (Entity-Relationship Diagram) จาก `schema.sql`

```mermaid
erDiagram
    USERS ||--o{ ASSIGNMENTS : "evaluator/evaluatee"
    USERS ||--o{ RESULTS : "evaluatee/evaluator"
    USERS ||--o{ ATTACHMENTS : "evaluatee"
    USERS ||--o{ SIGNATURES : "signer"
    USERS ||--o{ COMMENTS : "author"

    TOPICS ||--|{ INDICATORS : "has"

    INDICATORS ||--o{ INDICATOR_EVIDENCE : "allows"
    INDICATORS ||--o{ RESULTS : "measured_in"
    INDICATORS ||--o{ ATTACHMENTS : "evidence_for"

    EVIDENCE_TYPES ||--o{ INDICATOR_EVIDENCE : "allowed_in"
    EVIDENCE_TYPES ||--o{ ATTACHMENTS : "is_type"

    ASSIGNMENTS ||--|{ RESULTS : "contains"
    ASSIGNMENTS ||--o{ ATTACHMENTS : "has_files"
    ASSIGNMENTS ||--o{ SIGNATURES : "signed_in"
    ASSIGNMENTS ||--o{ COMMENTS : "commented_in"

    USERS {
        bigint id PK
        string email
        string password_hash
        string name_th
        enum role "admin, evaluator, evaluatee"
        enum status
    }

    TOPICS {
        bigint id PK
        string code
        string title_th
        decimal weight
        boolean active
    }

    INDICATORS {
        bigint id PK
        bigint topic_id FK
        string code
        string name_th
        enum type "score_1_4, yes_no, file_url"
        decimal weight
    }

    EVIDENCE_TYPES {
        int id PK
        string code
        string name_th
    }

    INDICATOR_EVIDENCE {
        bigint indicator_id PK, FK
        int evidence_type_id PK, FK
    }

    ASSIGNMENTS {
        bigint id PK
        bigint evaluator_id FK
        bigint evaluatee_id FK
        date start_date
        date end_date
        boolean is_active
    }

    RESULTS {
        bigint id PK
        bigint assignment_id FK
        bigint evaluatee_id FK
        bigint indicator_id FK
        decimal self_score
        decimal evaluator_score
        enum status "draft, submitted, evaluated, approved"
    }

    ATTACHMENTS {
        bigint id PK
        bigint assignment_id FK
        bigint evaluatee_id FK
        bigint indicator_id FK
        int evidence_type_id FK
        string file_name
        string storage_path
    }

    SIGNATURES {
        bigint id PK
        bigint assignment_id FK
        bigint evaluatee_id FK
        bigint evaluator_id FK
        text signature_data
    }

    COMMENTS {
        bigint id PK
        bigint assignment_id FK
        bigint evaluatee_id FK
        bigint evaluator_id FK
        text comment_text
    }
```

## คำอธิบายความสัมพันธ์ (Relationships)

1.  **Users (ผู้ใช้งาน)**: เป็นศูนย์กลาง เชื่อมโยงกับเกือบทุกตาราง
    *   เป็น `Evaluator` (ผู้ประเมิน) หรือ `Evaluatee` (ผู้ถูกประเมิน) ในตาราง `Assignments`
    *   เป็นเจ้าของคะแนนใน `Results`
    *   เป็นเจ้าของไฟล์ใน `Attachments`

2.  **Assignments (การมอบหมายงาน)**: เป็นตารางหลักในการเชื่อมโยงช่วงเวลาและการจับคู่
    *   กำหนดว่า ใครประเมินใคร (Evaluator -> Evaluatee)
    *   กำหนดช่วงเวลา (Start/End Date)
    *   ข้อมูลคะแนน (Results), ไฟล์แนบ (Attachments), ลายเซ็น (Signatures) จะผูกกับ Assignment ID นี้เสมอ

3.  **Topics & Indicators (หัวข้อและตัวชี้วัด)**: เป็น Master Data
    *   Topic 1 หัวข้อ มีได้หลาย Indicators (1:N)
    *   Indicator แต่ละตัว กำหนดได้ว่าต้องใช้หลักฐานประเภทไหนบ้าง (ผ่านตาราง `Indicator_Evidence`)

4.  **Results (ผลการประเมิน)**: เก็บคะแนน
    *   เก็บแยกราย Assignment + Evaluatee + Indicator (Unique Key)
    *   มีช่องเก็บคะแนนตนเอง (`self_score`) และคะแนนกรรมการ (`evaluator_score`)

5.  **Cascade Delete**:
    *   ถ้าลบ `Assignment` -> ข้อมูลลูก (Results, Attachments, Signatures) จะหายไปทั้งหมด (Clean)
    *   ถ้าลบ `User` -> ข้อมูลที่ User นั้นเป็นเจ้าของจะหายไป (Clean)
