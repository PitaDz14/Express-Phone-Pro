
# Express Phone Pro | نظام إدارة محل الهواتف

نظام متكامل لإدارة المخزون، المبيعات، الديون، والتقارير المالية.

## 🔐 تعليمات تفعيل حساب المدير (هام جداً)

بناءً على طلبك، إليك الطريقة الصحيحة لتفعيل حسابك باستخدام المعرف الظاهر في الصورة:

### 1. لا تستخدم قسم IAM
القسم الذي ظهر في صورتك (Add member) هو لمنح صلاحيات إدارة مشروع البرمجة، وليس لدخول التطبيق. لا تضع الـ UID هناك.

### 2. التفعيل عبر Firestore Database (الطريقة الصحيحة)
1. اذهب إلى [Firebase Console](https://console.firebase.google.com/).
2. من القائمة الجانبية، اختر **Firestore Database**.
3. ابحث عن مجموعة (Collection) اسمها `user_roles`.
4. اضغط على **Add document**.
5. في خانة **Document ID**: الصق المعرف الخاص بك: `krplhuv8bhyapfwcsd1lstxjakj1`
6. أضف الحقول التالية:
   - `role`: (string) القيمة: `Admin`
   - `userId`: (string) القيمة: `krplhuv8bhyapfwcsd1lstxjakj1`
   - `createdAt`: (timestamp) اختر التاريخ الحالي.
7. احفظ الوثيقة وقم بتحديث صفحة التطبيق.

*ملاحظة: تأكد من كتابة `Admin` بحرف A كبير.*

تم التطوير بواسطة: **Khaled_Deragha** © 2026
