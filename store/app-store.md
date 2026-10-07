# Вместе — тексты для App Store Connect

Вставлять в карточку приложения. Пароль демо-аккаунта лежит отдельно в `store/reviewer.txt` на этом компьютере и в ответном сообщении. В git его нет.

## Карточка

- Name: Вместе
- Subtitle: Общий бюджет для двоих
- Primary language: Russian
- Category: Finance
- Secondary category: Lifestyle
- Age rating: 4+
- Price: Free
- Bundle ID (заготовка, аккаунт Apple ещё не создан): app.vmeste.budget
- SKU: vmeste-ios
- Copyright: 2026 azzabik
- Privacy Policy URL: https://azzabik-sys.github.io/vmeste/privacy.html
- Support URL: https://azzabik-sys.github.io/vmeste/support.html
- Marketing URL: https://azzabik-sys.github.io/vmeste/
- Support email: azzabik@yandex.ru

## Описание

Вместе — бюджет на месяц для двоих. Один общий план, категории и траты. Второй человек входит по коду и видит те же цифры.

Что есть в приложении:
• категории с лимитами и общая сумма на месяц
• расход в одно нажатие
• предупреждения, если повседневные траты идут быстрее плана
• история: кто внёс, когда и на что
• русский, английский и вьетнамский

Вход по почте и паролю. Бюджетом делитесь только друг с другом. Покупок внутри приложения нет.

## Keywords

бюджет,расходы,семья,пара,финансы,категории,план,деньги,household,budget

## Promotional text

Общий месяц для двоих: план, категории и траты на одном экране.

## English localization

Subtitle: Shared budget for two

Description:

Vmeste is a monthly budget for two people. One shared plan, categories, and expenses. The other person joins with a code and sees the same numbers.

What you can do:
• category limits and one monthly total
• add an expense in one tap
• warnings when everyday spending runs ahead of the plan
• history that shows who entered it, when, and what it was
• Russian, English, and Vietnamese

Sign in with email and password. You share the budget only with each other. There are no in-app purchases.

Keywords: budget,couple,household,expenses,shared,categories,monthly,finance,plan,money

Promotional text: One shared month for two: a plan, categories, and expenses.

## Возраст 4+

На все вопросы про насилие, страх, взрослое, азарт, алкоголь, оружие, конкурсы и неограниченный веб-доступ ответ: Нет / None.

В приложении нет ленты чужого контента, нет своего браузера и нет покупок.

## Конфиденциальность (nutrition labels)

Данные связаны с личностью пользователя. Для трекинга не используются. Не продаются. Рекламы нет.

- Contact Info → Email Address. Используется для входа.
- Name. Имя в бюджете.
- User Content → Other User Content. Категории и заметки к тратам.
- Financial Info → Other Financial Info. Суммы бюджета и трат.
- Identifiers → User ID. Идентификатор входа.

Трекинг: нет. Сторонние рекламные SDK: нет.

## Шифрование

Приложение использует только стандартный HTTPS. Это исключение из экспортных правил.

В Xcode / Info.plist уже стоит `ITSAppUsesNonExemptEncryption = false`.

В анкете App Store: приложение использует шифрование, и оно освобождено (только HTTPS).

## Вход в Apple

Свой вход по почте и паролю. Sign in with Apple не подключён и для такого входа не требуется. Сторонних входов нет.

## Заметки для ревьюера

Demo sign-in is already confirmed. You do not need the inbox to open the app. This account is not a member of the developer’s live household.

Email and password: see the message that came with this preparation, or `store/reviewer.txt` on the build machine.

The sample budget uses Philippine pesos and a few made-up expenses.

Please try:
1. Sign in.
2. On Home, add an expense. It appears in History with the member name.
3. Open Plan and Settings.
4. Account deletion is in Settings → Delete account. It removes the login and the email. If another person is in the budget, their budget stays. This demo account is the only member, so the sample budget is deleted with the account. Please do this at the end.
5. Password recovery: sign out, tap Forgot password, and paste the link from the email plus a new password on the same screen. Do not open the link. Opening it in Mail fails. The app reads the link and saves the new password.

Privacy: https://azzabik-sys.github.io/vmeste/privacy.html
Support: https://azzabik-sys.github.io/vmeste/support.html

## Что не вставлять в карточку

Аккаунт Apple Developer и загрузка сборки остаются на тебе. Оболочка для проверки на телефоне открывает сайт. Для ревью лучше отдельное приложение, а не только сайт внутри WebView: так Apple часто отклоняет по пункту 4.2. Face ID и экран повторной попытки уже подготовлены, это не заменяет нормальную сборку.
