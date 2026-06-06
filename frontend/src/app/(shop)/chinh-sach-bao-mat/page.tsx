import LegalPage from "@/components/legal/LegalPage";

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Chính sách bảo mật"
      intro="Chính sách mô tả cách ThePawsome thu thập, sử dụng và bảo vệ dữ liệu cá nhân trong quá trình mua hàng và sử dụng trợ lý AI."
      sections={[
        {
          title: "Dữ liệu và mục đích xử lý",
          paragraphs: [
            "Chúng tôi xử lý thông tin tài khoản, liên hệ, địa chỉ giao hàng, đơn hàng, thanh toán, hồ sơ thú cưng và hội thoại AI để cung cấp dịch vụ, hỗ trợ khách hàng, chống gian lận và cải thiện độ an toàn của hệ thống.",
            "ThePawsome không lưu thông tin thẻ. VNPay xử lý dữ liệu thanh toán theo hệ thống của họ.",
          ],
        },
        {
          title: "Nhà cung cấp liên quan",
          paragraphs: [
            "Dữ liệu cần thiết có thể được truyền tới VNPay, OpenAI, Cloudinary, Google và nhà cung cấp hạ tầng để thực hiện đúng chức năng người dùng yêu cầu. Chúng tôi giới hạn dữ liệu theo mục đích và không bán dữ liệu cá nhân.",
            "Trợ lý AI có thể xử lý nội dung câu hỏi và hồ sơ thú cưng để cá nhân hóa. AI chỉ cung cấp thông tin tham khảo và không thay thế bác sĩ thú y.",
          ],
        },
        {
          title: "Lưu trữ, bảo vệ và quyền người dùng",
          paragraphs: [
            "Dữ liệu được lưu trong thời gian cần thiết cho vận hành, nghĩa vụ giao dịch và xử lý tranh chấp. Hệ thống áp dụng kiểm soát truy cập, mã hóa khi truyền và log có che giấu dữ liệu nhạy cảm.",
            "Người dùng có thể yêu cầu xem, sửa, rút lại sự đồng ý, hạn chế xử lý hoặc xóa dữ liệu theo pháp luật áp dụng bằng cách liên hệ qcontact.12@gmail.com.",
          ],
        },
        {
          title: "Cơ sở pháp lý",
          paragraphs: [
            "Baseline này tham chiếu Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 và các quy định Việt Nam có liên quan có hiệu lực tại thời điểm vận hành.",
          ],
        },
      ]}
    />
  );
}
