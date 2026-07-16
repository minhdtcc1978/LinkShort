# LinkShort — Real Backend + Pi Network Auth

## Kiến trúc mới (v1.1.0)

Trước đây app lưu mọi thứ bằng `localStorage`, nên link chỉ mở được trên đúng
trình duyệt đã tạo ra nó. Bản này thay bằng:

- **Database dùng chung:** Vercel KV (Redis) — mapping `shortCode → link`,
  xem `lib/kv.ts` và `lib/links-store.ts`.
- **Đăng nhập bằng tài khoản Pi Network:** dùng Pi SDK chính thức
  (`Pi.authenticate`), access token được **xác minh lại ở server** qua Pi
  Platform API (`https://api.minepi.com/v2/me`) trước khi tạo session —
  không bao giờ tin `uid`/`username` do client tự khai. Xem
  `lib/pi-server-auth.ts`, `lib/session.ts`, `app/api/auth/*`.
- **Redirect thật ở server:** `app/s/[code]/page.tsx` là Server Component,
  tra cứu KV và gọi `redirect()` ngay trên server (HTTP redirect thật) —
  hoạt động trên mọi thiết bị/trình duyệt, kể cả khi tắt JavaScript. Link có
  mật khẩu dùng Server Action (`<form action={...}>`) để xác minh mật khẩu
  mà không cần JS phía client.
- Mật khẩu bảo vệ link giờ được **hash bằng bcrypt**, không còn lưu
  plaintext hay hiển thị lại được như bản cũ.
- Có rate limit cơ bản (chống spam tạo link / spam đăng nhập) lưu trong KV.

## Cần cấu hình trước khi chạy

1. **Tạo Vercel KV store**: Vercel Dashboard → project → Storage → Create → KV,
   sau đó "Connect" vào project này (biến môi trường sẽ tự được điền).
2. **Tạo SESSION_SECRET**: chạy `openssl rand -base64 32`, dán vào biến môi
   trường `SESSION_SECRET`.
3. Copy `.env.example` → `.env.local` và điền các giá trị (khi chạy local).
4. **Đăng ký app trên Pi Developer Portal** với domain chính thức
   `https://solohost.id.vn` (Pi Network chỉ chấp nhận domain đã đăng ký cho
   validation key + authenticate flow).
5. Đặt file xác minh domain Pi yêu cầu (`validation-key.txt`) vào `public/`
   nếu Pi Developer Portal cung cấp cho bạn.

## Lưu ý quan trọng về Pi Network

`Pi.authenticate()` **chỉ hoàn tất được khi mở trong Pi Browser** (app Pi
Network trên điện thoại) hoặc trong khung Pi App Studio — mở bằng Chrome/Safari
thông thường sẽ không đăng nhập được (đây cũng là lý do bản cũ bị treo màn
hình đen: nó chặn cả app chỉ vì đợi đăng nhập Pi không bao giờ xong). Bản mới
**không chặn giao diện nữa** — ai cũng thấy trang chủ ngay, chỉ riêng nút
"Sign in with Pi" cần mở trong Pi Browser mới hoạt động.

## Test local

```bash
npm install
cp .env.example .env.local   # rồi điền giá trị thật
npm run dev
```

Nếu chưa cấu hình `KV_REST_API_URL`/`KV_REST_API_TOKEN`, app vẫn chạy được
bằng bộ nhớ tạm trong RAM (chỉ để dev), nhưng dữ liệu **sẽ mất khi restart**
và **không dùng được thật** — bắt buộc phải có Vercel KV thật trước khi deploy.

## Giới hạn còn lại

- Chưa có trang quản trị (admin) để xem toàn bộ link của mọi user.
- Chưa lưu lịch sử click theo thời gian thực (mới chỉ đếm tổng số click) —
  biểu đồ "xu hướng" trong Analytics Dashboard hiện dựa trên ngày tạo link
  thật, không phải click thật theo ngày.
