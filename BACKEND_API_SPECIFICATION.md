# ข้อกำหนด Backend API สำหรับระบบโปรไฟล์ลูกค้าและระบบให้คะแนน

## ภาพรวม
ข้อกำหนด API ที่ครบถ้วนสำหรับระบบตั้งค่าโปรไฟล์ลูกค้าและสิ่งอ้างอิงของระบบ Frontend ทีม Backend ควรดำเนินการใช้ endpoint เหล่านี้

---

## 1. การจัดการโปรไฟล์

### GET /api/customers/profile
**คำอธิบาย**: ดึงข้อมูลโปรไฟล์ผู้ใช้ปัจจุบัน  
**การตรวจสอบสิทธิ**: จำเป็น (Bearer token)  
**การตอบสนอง**:
```json
{
  "id": "string",
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "phoneNumber": "string",
  "phoneVerified": boolean,
  "profileImageUrl": "string (optional)",
  "createdAt": "ISO 8601 datetime",
  "updatedAt": "ISO 8601 datetime"
}
```

### PATCH /api/customers/profile
**คำอธิบาย**: อัปเดตข้อมูลโปรไฟล์ผู้ใช้  
**การตรวจสอบสิทธิ**: จำเป็น (Bearer token)  
**เนื้อหาคำขอ**:
```json
{
  "firstName": "string (ไม่บังคับ)",
  "lastName": "string (ไม่บังคับ)",
  "email": "string (ไม่บังคับ)",
  "phoneNumber": "string (ไม่บังคับ)"
}
```
**การตอบสนอง**: วัตถุโปรไฟล์ที่อัปเดต (เหมือนกับ GET)

### PATCH /api/customers/profile/upload
**คำอธิบาย**: อัปโหลดรูปโปรไฟล์  
**การตรวจสอบสิทธิ**: จำเป็น (Bearer token)  
**คำขอ**: multipart/form-data พร้อมฟิลด์ไฟล์ชื่อ `profileImage`  
**การตอบสนอง**:
```json
{
  "profileImageUrl": "string",
  "message": "string"
}
```

---

## 2. ที่อยู่ที่บันทึกไว้

### GET /api/customers/saved-addresses
**คำอธิบาย**: ดึงที่อยู่ที่บันทึกไว้ทั้งหมดของผู้ใช้  
**การตรวจสอบสิทธิ**: จำเป็น (Bearer token)  
**การตอบสนอง**:
```json
{
  "addresses": [
    {
      "id": "string",
      "label": "string (บ้าน, ที่ทำงาน, อื่น ๆ)",
      "address": "string",
      "latitude": number,
      "longitude": number,
      "isDefault": boolean,
      "createdAt": "ISO 8601 datetime",
      "updatedAt": "ISO 8601 datetime"
    }
  ]
}
```

### POST /api/customers/saved-addresses
**คำอธิบาย**: สร้างที่อยู่บันทึกใหม่  
**การตรวจสอบสิทธิ**: จำเป็น (Bearer token)  
**เนื้อหาคำขอ**:
```json
{
  "label": "string",
  "address": "string",
  "latitude": number,
  "longitude": number,
  "isDefault": boolean (ไม่บังคับ, ค่าเริ่มต้น: false)
}
```
**การตอบสนอง**: วัตถุที่อยู่ที่สร้าง

### PATCH /api/customers/saved-addresses/{id}/default
**คำอธิบาย**: ตั้งที่อยู่เป็นค่าเริ่มต้น  
**การตรวจสอบสิทธิ**: จำเป็น (Bearer token)  
**พารามิเตอร์ URL**: `id` (string - ID ที่อยู่)  
**การตอบสนอง**:
```json
{
  "id": "string",
  "label": "string",
  "address": "string",
  "latitude": number,
  "longitude": number,
  "isDefault": true
}
```

### DELETE /api/customers/saved-addresses/{id}
**คำอธิบาย**: ลบที่อยู่บันทึก  
**การตรวจสอบสิทธิ**: จำเป็น (Bearer token)  
**พารามิเตอร์ URL**: `id` (string - ID ที่อยู่)  
**การตอบสนอง**:
```json
{
  "success": boolean,
  "message": "string"
}
```

---

## 3. การตั้งค่าความปลอดภัย

### POST /api/customers/security/change-password
**คำอธิบาย**: เปลี่ยนรหัสผ่านผู้ใช้  
**การตรวจสอบสิทธิ**: จำเป็น (Bearer token)  
**เนื้อหาคำขอ**:
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```
**การตรวจสอบ**:
- รหัสผ่านปัจจุบันจะต้องตรงกับรหัสผ่านจริง
- รหัสผ่านใหม่จะต้องยาวอย่างน้อย 8 ตัวอักษร
- รหัสผ่านใหม่ไม่สามารถเหมือนกับรหัสผ่านปัจจุบัน

**การตอบสนอง**:
```json
{
  "success": boolean,
  "message": "string"
}
```

### GET /api/customers/security/devices
**คำอธิบาย**: ดึงอุปกรณ์ที่เข้าสู่ระบบทั้งหมด  
**การตรวจสอบสิทธิ**: จำเป็น (Bearer token)  
**การตอบสนอง**:
```json
{
  "devices": [
    {
      "id": "string",
      "deviceName": "string",
      "lastAccessedAt": "ISO 8601 datetime",
      "ipAddress": "string",
      "isCurrent": boolean
    }
  ]
}
```

### POST /api/customers/security/devices/{id}/logout
**คำอธิบาย**: ออกจากระบบจากอุปกรณ์เฉพาะ  
**การตรวจสอบสิทธิ**: จำเป็น (Bearer token)  
**พารามิเตอร์ URL**: `id` (string - ID อุปกรณ์)  
**การตอบสนอง**:
```json
{
  "success": boolean,
  "message": "string"
}
```

---

## 4. คำสั่ง

### GET /api/customers/orders
**คำอธิบาย**: ดึงคำสั่งทั้งหมดของผู้ใช้  
**การตรวจสอบสิทธิ**: จำเป็น (Bearer token)  
**พารามิเตอร์ Query (ไม่บังคับ)**:
- `status`: กรองตามสถานะ (pending, accepted, pickup, delivering, completed, cancelled)
- `limit`: จำนวนผลลัพธ์ (ค่าเริ่มต้น: 50)
- `offset`: ออฟเซ็ตการแบ่งน้อย (ค่าเริ่มต้น: 0)

**การตอบสนอง**:
```json
{
  "orders": [
    {
      "id": "string",
      "orderNumber": "string",
      "merchantName": "string",
      "riderName": "string (ไม่บังคับ)",
      "totalAmount": number,
      "status": "pending|accepted|pickup|delivering|completed|cancelled",
      "createdAt": "ISO 8601 datetime",
      "completedAt": "ISO 8601 datetime (ไม่บังคับ)",
      "deliveryAddress": "string",
      "hasRating": boolean,
      "rating": {
        "merchantRating": number,
        "riderRating": number
      } (ไม่บังคับ, เฉพาะ hasRating เป็น true)
    }
  ]
}
```

### GET /api/customers/orders/{id}
**คำอธิบาย**: ดึงรายละเอียดคำสั่งเฉพาะ  
**การตรวจสอบสิทธิ**: จำเป็น (Bearer token)  
**พารามิเตอร์ URL**: `id` (string - ID คำสั่ง)  
**การตอบสนอง**: วัตถุคำสั่งเดี่ยว (โครงสร้างเหมือนกับรายการ GET /orders)

### POST /api/customers/orders/{id}/rating
**คำอธิบาย**: ส่งการให้คะแนนสำหรับคำสั่งที่เสร็จสิ้น  
**การตรวจสอบสิทธิ**: จำเป็น (Bearer token)  
**พารามิเตอร์ URL**: `id` (string - ID คำสั่ง)  
**เนื้อหาคำขอ**:
```json
{
  "merchantRating": number (1-5),
  "riderRating": number (1-5),
  "merchantComment": "string (ไม่บังคับ, ขีดจำกัด 500 ตัวอักษร)",
  "riderComment": "string (ไม่บังคับ, ขีดจำกัด 500 ตัวอักษร)"
}
```
**การตรวจสอบ**:
- คะแนนทั้งสองจะต้องอยู่ระหว่าง 1 ถึง 5
- คำสั่งจะต้องเสร็จสิ้น
- หากคำสั่งมีการให้คะแนนแล้ว ให้ส่งกลับข้อผิดพลาดหรืออัปเดตที่มีอยู่

**การตอบสนอง**:
```json
{
  "success": boolean,
  "rating": {
    "orderId": "string",
    "merchantRating": number,
    "riderRating": number,
    "merchantComment": "string (ไม่บังคับ)",
    "riderComment": "string (ไม่บังคับ)",
    "createdAt": "ISO 8601 datetime",
    "updatedAt": "ISO 8601 datetime"
  }
}
```

---

## การตรวจสอบสิทธิ

Endpoint ทั้งหมด (ยกเว้น login/register) ต้องการ:
```
Header: Authorization: Bearer {access_token}
```

โดยที่ `access_token` ถูกดึงมาจากการเข้าสู่ระบบและจัดเก็บไว้ใน localStorage ด้านไคลเอนต์

---

## การตอบสนองข้อผิดพลาด

ข้อผิดพลาดทั้งหมดควรส่งกลับรหัสสถานะ HTTP ที่เหมาะสม:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "BadRequest"
}
```

### รหัสสถานะทั่วไป:
- `200 OK` - สำเร็จ
- `201 Created` - สร้างทรัพยากรสำเร็จ
- `204 No Content` - สำเร็จโดยไม่มีเนื้อหา
- `400 Bad Request` - ข้อมูลคำขอไม่ถูกต้อง
- `401 Unauthorized` - ไม่มีหรือการตรวจสอบสิทธิไม่ถูกต้อง
- `403 Forbidden` - ผู้ใช้ไม่ได้รับอนุญาตให้เข้าถึง
- `404 Not Found` - ไม่พบทรัพยากร
- `409 Conflict` - ความขัดแย้ง (เช่น มีการให้คะแนนแล้ว)
- `500 Internal Server Error` - ข้อผิดพลาดของเซิร์ฟเวอร์

---

## กฎการตรวจสอบข้อมูล

### โปรไฟล์
- `firstName`, `lastName`: 1-100 ตัวอักษร, ไม่มีอักขระพิเศษ
- `email`: รูปแบบอีเมลที่ถูกต้อง
- `phoneNumber`: รูปแบบโทรศัพท์ที่ถูกต้อง (อย่างน้อย 10 หลัก)

### ที่อยู่
- `label`: 1-50 ตัวอักษร
- `address`: 1-500 ตัวอักษร
- `latitude`: -90 ถึง 90 (ส่วนทศนิยมองศา)
- `longitude`: -180 ถึง 180 (ส่วนทศนิยมองศา)

### ความปลอดภัย
- `currentPassword`: ต้องตรงกับรหัสผ่านที่เก็บไว้
- `newPassword`: 8+ ตัวอักษร, ประกอบด้วยตัวพิมพ์ใหญ่, ตัวพิมพ์เล็ก, ตัวเลข

### การให้คะแนน
- `merchantRating`, `riderRating`: จำนวนเต็ม 1-5
- `comments`: ไม่บังคับ, ขีดจำกัด 500 ตัวอักษรต่อรายการ

---

## หมายเหตุสำหรับการดำเนินการ Backend

1. **อัปโหลดรูปภาพ**: สำหรับการอัปโหลดรูปโปรไฟล์ ให้ใช้ multipart/form-data และจัดเก็บรูปภาพอย่างปลอดภัย
2. **แสตมป์เวลา**: ใช้รูปแบบ ISO 8601 เสมอสำหรับฟิลด์วันที่และเวลา
3. **พิกัด**: จัดเก็บละติจูด/ลองจิจูดโดยมีทศนิยมอย่างน้อย 4 ตำแหน่ง
4. **การติดตามอุปกรณ์**: จับข้อมูลอุปกรณ์จากส่วนหัวคำขอ (User-Agent, IP address)
5. **ข้อ จำกัด การให้คะแนน**: ตรวจสอบให้แน่ใจว่าการให้คะแนนสามารถส่งได้เฉพาะสำหรับคำสั่งที่เสร็จสิ้นและป้องกันการให้คะแนนซ้ำ
6. **ที่อยู่เริ่มต้น**: เมื่อตั้งที่อยู่เริ่มต้นใหม่ ให้ยกเลิกการตั้งค่าที่อยู่เริ่มต้นก่อนหน้าโดยอัตโนมัติ

---

## ทดสอบ Endpoint

คุณสามารถทดสอบ endpoint เหล่านี้ได้โดยใช้:
- Postman
- cURL
- Thunder Client
- VS Code REST Client

ตัวอย่างที่มี cURL:
```bash
curl -X GET http://localhost:3000/api/customers/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

**เวอร์ชัน**: 1.0  
**อัปเดตครั้งล่าสุด**: 2026-02-20  
**Frontend URL**: http://localhost:3001  
**Expected Backend URL**: http://localhost:3000
