import LegalPage from "@/components/legal/LegalPage";

export default function FaqPage() {
  return (
    <LegalPage
      title="FAQ"
      intro="Các câu hỏi thường gặp khi mua sắm, thanh toán, theo dõi đơn hàng và sử dụng Catbot trên ThePawsome."
      sections={[
        {
          title: "Tôi có cần tài khoản để mua hàng không?",
          paragraphs: [
            "Bạn có thể xem sản phẩm mà không cần đăng nhập. Một số tính năng như lịch sử đơn hàng, hồ sơ thú cưng và cá nhân hóa với Catbot cần tài khoản để bảo vệ dữ liệu của bạn.",
          ],
        },
        {
          title: "Theo dõi đơn hàng bằng cách nào?",
          paragraphs: [
            "Sau khi checkout thành công, hệ thống cấp mã đơn. Bạn có thể xem đơn trong mục Đơn hàng hoặc tra cứu bằng email và mã đơn nếu đặt hàng với tư cách khách.",
          ],
        },
        {
          title: "ThePawsome hỗ trợ thanh toán nào?",
          paragraphs: [
            "ThePawsome hỗ trợ thanh toán khi nhận hàng và chuyển khoản VietQR qua SePay. Nếu đã chuyển khoản nhưng trạng thái chưa cập nhật, không thanh toán lại; hãy liên hệ hỗ trợ kèm mã đơn và ảnh biên lai.",
          ],
        },
        {
          title: "Tôi muốn đổi địa chỉ hoặc số điện thoại nhận hàng?",
          paragraphs: [
            "Hãy liên hệ support@thepawsome.store càng sớm càng tốt trước khi đơn chuyển sang trạng thái đang giao. Nếu đơn đã bàn giao vận chuyển, việc thay đổi có thể phụ thuộc vào đối tác giao hàng.",
          ],
        },
        {
          title: "Catbot có thể làm gì?",
          paragraphs: [
            "Catbot có thể tư vấn thông tin chăm sóc thú cưng, tìm sản phẩm trong cửa hàng và tham khảo hồ sơ thú cưng do bạn tạo. Catbot không chẩn đoán bệnh, kê thuốc, xem dữ liệu của người khác hoặc tự thêm sản phẩm vào giỏ hàng.",
          ],
        },
        {
          title: "Khi nào cần liên hệ bác sĩ thú y thay vì hỏi Catbot?",
          paragraphs: [
            "Nếu thú cưng khó thở, co giật, nghi ngộ độc, bí tiểu, nôn liên tục, chảy máu nhiều, nằm bất động hoặc đau dữ dội, hãy liên hệ bác sĩ thú y hoặc cơ sở cấp cứu thú y ngay.",
          ],
        },
        {
          title: "Kênh hỗ trợ chính là gì?",
          paragraphs: [
            "Bạn có thể liên hệ support@thepawsome.store hoặc +84888987400. Khi hỏi về đơn hàng, hãy cung cấp mã đơn, email đặt hàng, số điện thoại nhận hàng và hình ảnh liên quan nếu có lỗi sản phẩm hoặc giao nhận.",
          ],
        },
      ]}
    />
  );
}
