import LegalPage from "@/components/legal/LegalPage";

export default function PaymentPolicyPage() {
  return (
    <LegalPage
      title="Chính sách thanh toán"
      intro="ThePawsome hỗ trợ thanh toán khi nhận hàng và chuyển khoản qua VietQR (SePay) tự động."
      sections={[
        { title: "COD", paragraphs: ["Khách hàng thanh toán khi nhận hàng. Đơn chỉ được ghi nhận doanh thu khi quy trình vận hành xác nhận phù hợp."] },
        { title: "Chuyển khoản VietQR (SePay)", paragraphs: ["ThePawsome hiển thị mã VietQR để quét thanh toán và xác nhận giao dịch tự động qua SePay Webhook. Trạng thái thanh toán được cập nhật ngay lập tức sau khi nhận được thông tin đối soát."] },
        { title: "Giao dịch cần đối soát", paragraphs: ["Nếu thanh toán thành công sau khi thời gian giữ hàng hết hoặc callback chưa đồng bộ, hệ thống đánh dấu đối soát. Khách hàng không nên thanh toán lại và cần liên hệ hỗ trợ."] },
      ]}
    />
  );
}
