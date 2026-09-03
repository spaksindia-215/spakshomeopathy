import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';

/**
 * `/privacy-policy` — ported from `privacy-policy.blade.php`. Body verified
 * byte-identical to production (raw capture).
 *
 * The <title> "Spakshomeopathy - About Us" is a copy-paste bug, CONFIRMED
 * LIVE in production (contract rank 6), preserved verbatim (F-17).
 *
 * The breadcrumb block is commented out in the Blade source (`<!--...-->`)
 * and therefore never rendered by Laravel (contract §12.4: commented code
 * has no behavior). Reproduced here as a JSX comment for the same reason.
 */
export const metadata: Metadata = {
  title: 'Spakshomeopathy - About Us',
  other: {
    'msapplication-TileColor': '#ffffff',
    'msapplication-TileImage': 'images/favicon/ms-icon-144x144.png',
    'theme-color': '#ffffff',
  },
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <div className="page-wrapper">
        <PublicStylesheets />
        {/* /.topbar-one */}
        <PublicHeader />
        {/* /.header-one */}
        {/* /.inner-banner */}
        {/* /.sec-pad */}
        {/*
      <div class="breadcrumb">
      <div class="container">
      <div class="row">
      <div class="col-12">
      <ul class="breadcrumb">
      <li class="breadcrumb-item"><a href="http://spakshomeopathy.com">Home</a></li>
      <li class="breadcrumb-item active" aria-current="page">Privacy and Policy </li>
      </ul>
      </div>
      </div>
      </div>
      </div>
      */}

        <div className="container">
          <div className="row">
            <div className="col-12">
              <img
                src="assets/images/privacy-policy.jpg"
                className="img-fluid"
                alt="Awesome Image"
              />
            </div>
          </div>
        </div>

        <section className="cover-page feature-two homeabout">
          <div className="container">
            <h1 className="head1 f-w-700 t-center m-t-1-5 m-m-t-2">PRIVACY POLICY</h1>
            <p className="para1 m-t-1-5">
              {' '}
              Spaks india business solution Pvt Ltd <span className="f-w-600">{'we"'}</span>) takes
              the privacy of your information seriously. This privacy notice (&quot;
              <span className="f-w-600">Privacy Notice</span>&quot;) describes the types of personal
              information we collect from you through our website (including sub-domains and
              microsites) and mobile applications. It also describes the purposes for which we
              collect that personal information, the other parties with whom we may share it and the
              measures we take to protect the security of your data. It also tells you about your
              rights and choices with respect to your personal information, and how you can contact
              us about our privacy practices.{' '}
            </p>
            <p className="para1 m-t-1">
              {' '}
              You are advised to carefully read this Privacy Notice before using or availing any of
              our products and/or services.{' '}
            </p>
            <ol className="para2_ol m-t-2 m-m-t-8" start={1}>
              <li className="para2_li f-w-700"> DEFINITIONS </li>
            </ol>
            <p className="para1 m-t-1 m-m-t-2">
              {' '}
              In this Privacy Notice, the following definitions are used:{' '}
            </p>
            <p className="para1 f-w-600 m-t-1 m-m-t-3"> Cookies </p>
            <p className="para1">
              {' '}
              a small file placed on your device by our website or mobile application when you
              either visit or use certain features of our website or mobile application. A cookie
              generally allows a website to remember your actions or preference for a certain period
              of time.{' '}
            </p>
            <p className="para1 f-w-600 m-t-1 m-m-t-3"> Data </p>
            <p className="para1">
              {' '}
              includes non-personal information, personal information and sensitive personal
              information about you, which either directly or indirectly in combination with other
              information, could allow you to be identified when you visit our stores, website
              and/or mobile application.{' '}
            </p>
            <p className="para1 f-w-600 m-t-1 m-m-t-3"> Data Protection Laws </p>
            <p className="para1">
              {' '}
              any applicable law for the time being in force relating to the processing of
              Data.{' '}
            </p>
            <p className="para1 f-w-600 m-t-1 m-m-t-3"> Partners </p>
            <p className="para1">
              {' '}
              select third parties (including Spaks india business solution Pvt Ltd) with whom we
              have contracts for the businesses described in this Privacy Notice.{' '}
            </p>
            <p className="para1 f-w-600 m-t-1 m-m-t-3"> Service Providers </p>
            <p className="para1 f-w-600 m-t-1 m-m-t-3"> Spaks Homeopathy </p>
            <p className="para1">
              {' '}
              Spaks india business solution Pvt Ltd , a company incorporated in India whose
              registered office is at E-38, Budh Vihar, Badarpur, New Delhi 110044{' '}
            </p>
            <p className="para1 f-w-600 m-t-1 m-m-t-3"> Spaks Homeopathy </p>
            <p className="para1 f-w-600 m-t-1 m-m-t-3"> User or you </p>
            <p className="para1">
              {' '}
              the natural person who accesses our stores, website or mobile application.{' '}
            </p>
            <ol className="para2_ol m-t-3 m-m-t-8" start={2}>
              <li className="para2_li f-w-700"> WHAT DATA DO WE COLLECT ABOUT YOU </li>
            </ol>
            <p className="para1 m-t-1 m-m-t-2">
              {' '}
              Spaks Homeopathy collects Data for various purposes set out in this Privacy
              Notice.{' '}
            </p>
            <p className="para1 m-t-1 m-m-t-3">
              {' '}
              This Data includes, without limitation, the following categories:{' '}
            </p>
            <ol className="para1_ol m-t-1 m-m-t-3">
              <li className="para1_li">
                {' '}
                Contact information:{' '}
                <span className="f-w-n">
                  first and last name, email address, postal address, country, employer, phone
                  number and other similar contact data.
                </span>{' '}
              </li>
              <li className="para1_li">
                {' '}
                Financial information:{' '}
                <span className="f-w-n">
                  payment instrument information, transactions, transaction history, preferences,
                  method, mode and manner of payment, spending pattern or trends, and other similar
                  data.
                </span>{' '}
              </li>
              <li className="para1_li">
                {' '}
                Technical information:{' '}
                <span className="f-w-n">
                  website, device and mobile app usage, Internet Protocol (IP) address and similar
                  information collected via automated means, such as cookies, pixels and similar
                  technologies.
                </span>{' '}
              </li>
              <li className="para1_li">
                {' '}
                Transaction information:{' '}
                <span className="f-w-n">
                  the date of the transaction, total amount, transaction history and preferences and
                  related details.
                </span>{' '}
              </li>
              <li className="para1_li">
                {' '}
                <span className="f-w-n">
                  Health related information, such as information or records relating to Your
                  medical/ health history, health status, details of treatment plans and medication
                  prescribed by a Medical Practitioner, dosage details such as frequency of dosage,
                  alternative medication, medicines ordered by You through the Platform, laboratory
                  testing results and any other information inferred there from
                </span>{' '}
              </li>
              <li className="para1_li">
                {' '}
                Product and service information:{' '}
                <span className="f-w-n">
                  Your account membership number, registration and payment information, and
                  program-specific information, when you request products and/or services directly
                  from us, or participate in marketing programs.
                </span>{' '}
              </li>
              <li className="para1_li">
                {' '}
                Personal information:{' '}
                <span className="f-w-n">
                  Age, sex, date of birth, marital status, nationality, details of government
                  identification documents provided, occupation, ethnicity, religion, travel history
                  or any other personal information provided in responses to surveys or
                  questionnaires.{' '}
                </span>{' '}
              </li>
              <li className="para1_li">
                {' '}
                <span className="f-w-n">
                  Your reviews, feedback and opinions about our products, programmes and services.
                </span>{' '}
              </li>
              <li className="para1_li">
                {' '}
                Loyalty programme information:{' '}
                <span className="f-w-n">
                  your loyalty membership information, account details, profile or password details
                  and any frequent flyer or travel partner programme affiliation.
                </span>{' '}
              </li>
            </ol>
            <ol className="para2_ol m-t-3 m-m-t-8" start={3}>
              <li className="para2_li f-w-700"> HOW WE COLLECT DATA </li>
            </ol>
            <p className="para1 m-t-1 m-m-t-3"> We collect Data in the following ways: </p>
            <ol className="para1_ol m-t-1 m-m-t-3">
              <li className="para1_li">
                {' '}
                Information You Give Us:{' '}
                <span className="f-w-n">
                  We receive and store any information you enter on our website or mobile
                  application or give us in any other way (e.g., at outlets, stores, hotels,
                  kiosks). Please see the section titled &quot;Data Shared by You&quot; for more
                  information.
                </span>{' '}
              </li>
              <li className="para1_li">
                {' '}
                Automatic Information We Collect:{' '}
                <span className="f-w-n">
                  We use &quot;cookies&quot;, pixels and similar technologies to receive and store
                  certain types of information whenever you interact with us. Please see the section
                  below, titled &quot;Data that is Collected Automatically&quot; for more
                  information.
                </span>{' '}
              </li>
              <li className="para1_li">
                {' '}
                E-mail Communications:{' '}
                <span className="f-w-n">
                  To help us make e-mails more relevant and interesting, we often receive a
                  confirmation (if your device supports such capabilities) when you open e-mail from
                  us or click on a link in the e-mail. You can choose not to receive marketing
                  emails from us by clicking on the unsubscribe link in any marketing email.
                </span>{' '}
              </li>
              <li className="para1_li">
                {' '}
                Automatic Information We Collect from Other Websites:{' '}
                <span className="f-w-n">
                  We receive and store certain types of information when you interact with
                  third-party websites that use our technology or with whom we have a specific
                  agreement. Because we process this information on behalf of the applicable website
                  operators, collection, processing, and use of such information is subject to the
                  applicable website operators&rsquo; privacy policies and is not covered by our
                  Privacy Notice.{' '}
                </span>{' '}
              </li>
              <li className="para1_li">
                {' '}
                Information Previously Provided to Spaks india business solution Pvt Ltd:{' '}
                <span className="f-w-n">
                  Where you have shared any information previously with any of the Spaks india
                  business solution Pvt Ltd. and have consented to the further sharing of such
                  information, such information will be shared with us by the Spaks india business
                  solution Pvt Ltd.{' '}
                </span>{' '}
              </li>
            </ol>
            <p className="para1 m-t-1 m-m-t-3">
              {' '}
              You can make choices about our collection and use of your Data. For example, you may
              want to access, edit or remove your Data on our website or mobile application. When
              you are asked to provide Data, you may decline.{' '}
            </p>
            <ol className="para2_ol m-t-3 m-m-t-8" start={4}>
              <li className="para2_li f-w-700"> DATA SHARED BY YOU </li>
            </ol>
            <p className="para1 m-t-1 m-m-t-3">
              {' '}
              Spaks Homeopathy may collect your Data in several ways from your use of our stores,
              website or mobile application. For instance:{' '}
            </p>
            <ol className="para1_ol m-t-1 m-m-t-3">
              <li className="para1_li">
                {' '}
                <span className="f-w-n">
                  when you register with us to receive our products and/or services;
                </span>{' '}
              </li>
              <li className="para1_li">
                {' '}
                <span className="f-w-n">
                  when you conduct a transaction with us or attempt a transaction at our stores, on
                  our website or mobile application;
                </span>{' '}
              </li>
              <li className="para1_li">
                {' '}
                <span className="f-w-n">
                  when you complete surveys conducted by or for us;
                </span>{' '}
              </li>
              <li className="para1_li">
                {' '}
                <span className="f-w-n">
                  when you elect to receive any communications (including promotional offers) from
                  us;{' '}
                </span>{' '}
              </li>
              <li className="para1_li">
                {' '}
                <span className="f-w-n">
                  from the information gathered by your visit to our stores, website or mobile
                  application;
                </span>{' '}
              </li>
            </ol>
            <ol className="para2_ol m-t-3 m-m-t-8" start={5}>
              <li className="para2_li f-w-700"> DATA THAT IS COLLECTED AUTOMATICALLY </li>
            </ol>
            <ol className="para1_ol m-t-1 m-m-t-3">
              <li className="para1_li">
                {' '}
                <span className="f-w-n">
                  We automatically collect some information when you visit our website or use our
                  mobile application. This information helps us to make improvements to our content
                  and navigation. The information collected automatically includes your IP address.
                </span>{' '}
              </li>
              <li className="para1_li">
                {' '}
                <span className="f-w-n">
                  Our web servers or affiliates who provide analytics and performance enhancement
                  services collect IP addresses, operating system details, browsing details, device
                  details and language settings. This information is aggregated to measure the
                  number of visits, average time spent on the site, pages viewed and similar
                  information. Spaks Homeopathy uses this information to measure the site usage,
                  improve content and to ensure safety and security, as well as enhance performance
                  of our website or mobile application.
                </span>{' '}
              </li>
              <li className="para1_li">
                {' '}
                <span className="f-w-n">
                  We may collect your Data automatically via Cookies, pixels and similar
                  technologies in line with settings on your browser. For more information about
                  Cookies, please see the section below, titled{' '}
                  <span className="f-w-600">&quot;Cookies&quot;</span>.
                </span>
              </li>
            </ol>

            <p className="para1 m-t-1 m-m-t-3">
              {' '}
              Any or all the above Data may be required by us from time to time to provide
              information relating to Spaks Homeopathy and to work on the experience when using our
              website or mobile application. Specifically, Data may be used by us for the following
              reasons:{' '}
            </p>

            <p className="para1 m-t-1 m-m-t-3">
              {' '}
              We treat these inferences as personal information (or sensitive personal information,
              as the case may be), where required under applicable law. Some of the above grounds
              for processing will overlap and there may be several grounds which justify our use of
              your personal information.{' '}
            </p>
            <p className="para1 m-t-1 m-m-t-3">
              {' '}
              Where required under applicable law, we will only use your personal information
              (including sensitive personal information) with your consent; as necessary to provide
              you with products and/or services; to comply with a legal obligation; or when there is
              a legitimate interest that necessitates the use.{' '}
            </p>
            <ol className="para2_ol m-t-3 m-m-t-8" start={7}>
              <li className="para2_li f-w-700"> MINORS </li>
            </ol>
            <p className="para1 m-t-1 m-m-t-3">
              {' '}
              Our website and mobile application do not offer products or services for use by
              minors. If you are under 18, you may use our website or mobile application only with
              the involvement of a parent or guardian.{' '}
            </p>
            <ol className="para2_ol m-t-3 m-m-t-8" start={8}>
              <li className="para2_li f-w-700"> SHARING OF DATA </li>
            </ol>
            <p className="para1 m-t-1 m-m-t-3"> We may share your Data with/ for: </p>
            <ol className="para1_ol m-t-1 m-m-t-3">
              <li className="para1_li">
                {' '}
                Partners:{' '}
                <span className="f-w-n">
                  &nbsp;We may make available to you services, products, or applications provided by
                  Partners for use on or through our website or mobile application. If you choose to
                  use such service, customer information related to those transactions may be shared
                  with such Partner.{' '}
                </span>
                <p className="m-t-half f-w-n">
                  {' '}
                  Such Partners will be required to respect the security of your Data and to treat
                  it in accordance with this privacy policy and applicable law.{' '}
                </p>
              </li>
              {/* Malformed in source: this <p> sits directly inside the <ol>,
                not wrapped in a <li>, immediately followed by a stray
                closing </li> with no matching opening tag. A real browser's
                HTML parser silently drops that unmatched closing tag (it
                cannot close anything), so the parsed DOM is exactly what
                is reproduced here: this <p> as a direct child of <ol>,
                with no stray tag surviving. Preserved per contract
                NN-5/F-16 — this is the parser-corrected DOM Laravel's raw
                (broken) markup actually produces, not a silent fix. */}
              <p className="para1 m-t-half f-w-n">
                These Service Providers will be required to only process Data in accordance with
                express instructions and as necessary to perform services for purposes set forth in
                this Privacy Notice. The Service Providers will also be required to safeguard the
                security and confidentiality of the Data they process by implementing appropriate
                technical and organizational security measures and confidentiality obligations
                binding employees accessing Data.
              </p>
              <li className="para1_li">
                {' '}
                Protecting Spaks Homeopathy:{' '}
                <span className="f-w-n">
                  We may release Data when we believe release is appropriate to comply with
                  applicable law or legal process, enforce or apply the&nbsp;Terms of Use of our
                  website or mobile application and other agreements, protect Spaks Homeopathy
                  against harm or financial loss, when we believe disclosure is necessary to protect
                  individuals&rsquo; vital interests, or in connection with an investigation of
                  suspected or actual fraudulent or illegal activity. This may include exchanging
                  information with other companies and organizations for fraud protection, risk
                  management and dispute resolution. This does not include selling or otherwise
                  disclosing personal information of users for commercial purposes in violation of
                  this Privacy Notice.{' '}
                </span>{' '}
              </li>
              <li className="para1_li">
                {' '}
                Business Transfers:{' '}
                <span className="f-w-n">
                  As we continue to develop our business, we might sell or buy subsidiaries or
                  business units. Your Data (including in relation to loyalty programs) may be
                  transferred as part of such transaction. Any Data that we receive from a third
                  party pursuant to such transactions will be processed in accordance with this
                  Privacy Notice and applicable law.{' '}
                </span>{' '}
              </li>
              <li className="para1_li">
                {' '}
                Third Parties:{' '}
                <span className="f-w-n">
                  We may also share your Data with other third parties where:{' '}
                </span>
                <ul className="para3_ul m-t-half m-m-t-1">
                  <li className="para3_li"> You request or authorize us to do so; </li>
                  <li className="para3_li">
                    {' '}
                    We need to comply with applicable law or respond to valid legal process; or{' '}
                  </li>
                  <li className="para3_li">
                    {' '}
                    We need to operate and maintain the security of our website or mobile
                    application, including to prevent or stop an attack on our computer systems or
                    networks.{' '}
                  </li>
                </ul>
                <p className="para1 m-t-half f-w-n m-m-t-3">
                  {' '}
                  We require these third parties by contract to only process sensitive personal data
                  in accordance with our instructions and as necessary to perform services on our
                  behalf or in compliance with applicable law. We also require them to safeguard the
                  security and confidentiality of the sensitive personal data they process on our
                  behalf by implementing appropriate confidentiality, technical and organizational
                  security measures.{' '}
                </p>
              </li>
            </ol>
            <ol className="para2_ol m-t-3 m-m-t-8" start={9}>
              <li className="para2_li f-w-700"> KEEPING DATA SECURE </li>
            </ol>
            <p className="para1 m-t-1 m-m-t-3">
              {' '}
              We will use technical and organisational measures to safeguard your Data and we store
              your Data on secure servers. Technical and organisational measures include measures to
              deal with any suspected data breach. If you suspect any misuse or loss or unauthorised
              access to your Data, please let us know immediately by contacting us by e-mail at our
              email address provided at Clause 16 below.{' '}
            </p>
            <ol className="para2_ol_2 m-t-3 m-m-t-8" start={10}>
              <li className="para2_li f-w-700"> RETENTION OF DATA </li>
            </ol>
            <p className="para1 m-t-1 m-m-t-3">
              {' '}
              Spaks Homeopathy retains Data for as long as necessary for the use of our products
              and/or services or to provide access to and use of our website or mobile application,
              or for other essential purposes such as complying with our legal obligations,
              resolving disputes, enforcing our agreements and as long as processing and retaining
              your Data is necessary and is permitted by applicable law. Because these needs can
              vary for different data types and purposes, actual retention periods can vary
              significantly.{' '}
            </p>
            <p className="para1 m-t-1 m-m-t-3">
              {' '}
              Even if we delete your Data, including on account of exercise of your right under
              Clause 10 below, it may persist on backup or archival media for audit, legal, tax or
              regulatory purposes.{' '}
            </p>
            <ol className="para2_ol_2 m-t-3 m-m-t-8" start={11}>
              <li className="para2_li f-w-700"> YOUR RIGHTS AND CHOICES </li>
            </ol>
            <p className="para1 m-t-1 m-m-t-3">
              {' '}
              When we process Data about you, we do so with your consent and/or as necessary to
              operate our business, meet our contractual and legal obligations, protect the security
              of our systems and our customers, or fulfil other legitimate interests of Spaks
              Homeopathy as described in this Privacy Notice.
              <br /> You have the following rights in relation to your sensitive personal
              information and you can exercise it by submitting a request as described in the{' '}
              <span className="f-w-600">&quot;How to Contact Us&quot;</span> section below.{' '}
            </p>
            <ul className="para3_ul m-t-half m-m-t-1">
              <li className="para3_li"> Right to Access, Review and Modify </li>
              <li className="para3_li"> Right to Correction </li>
              <li className="para3_li"> Right to Withdraw Consent </li>
            </ul>
            <p className="para1 m-t-1 m-m-t-3">
              {' '}
              It is important that the Data we hold about you is accurate and current. Please keep
              us informed if your personal information changes during the period for which we hold
              it.{' '}
            </p>
            <ol className="para2_ol_2 m-t-3 m-m-t-8" start={12}>
              <li className="para2_li f-w-700"> WHERE WE STORE DATA </li>
            </ol>
            <p className="para1 m-t-1 m-m-t-3">
              {' '}
              Data collected under this Privacy Notice is hosted on servers located in India.{' '}
            </p>
            <ol className="para2_ol_2 m-t-3 m-m-t-8" start={13}>
              <li className="para2_li f-w-700"> PROCESSING YOUR DATA </li>
            </ol>
            <p className="para1 m-t-1 m-m-t-3">
              {' '}
              We take steps to ensure that the Data we collect under this Privacy Notice is
              processed according to the provisions of this Privacy Notice and the requirements of
              applicable law.{' '}
            </p>
            <ol className="para2_ol_2 m-t-3 m-m-t-8" start={14}>
              <li className="para2_li f-w-700"> APP PERMISSIONS THAT WE CAPTURE </li>
            </ol>
            <p className="para1 m-t-1 m-m-t-2">
              {' '}
              We ask for the following app permissions while onboarding, in order to optimize the
              experience for you:{' '}
            </p>
            <p className="para1 f-w-600 m-t-1 m-m-t-3"> Location </p>
            <p className="para1">
              {' '}
              It is recommended that you set your location sharing &apos;Always&apos; as it helps us
              to show you location specific data like availability of products. You can change this
              anytime.{' '}
            </p>
            <p className="para1 f-w-600 m-t-1 m-m-t-3"> Camera </p>
            <p className="para1">
              {' '}
              To allow you to take a photo of prescriptions &amp; directly upload it to the
              app.{' '}
            </p>
            <p className="para1 f-w-600 m-t-1 m-m-t-3"> Photos/Media/Files </p>
            <p className="para1">
              {' '}
              Media access permission is needed to store and retrieve your uploads such as
              prescription uploads on your device.{' '}
            </p>
            <p className="para1 f-w-600 m-t-1 m-m-t-3"> SMS </p>
            <p className="para1">
              {' '}
              To support automatic OTP confirmation, so that you don&apos;t have to enter the
              authentication code manually.{' '}
            </p>
            <p className="para1 f-w-600 m-t-1 m-m-t-3"> Receive SMS </p>
            <p className="para1">
              {' '}
              This helps us to send you payment related SMS by our payment partner JustPay.{' '}
            </p>
            <p className="para1 f-w-600 m-t-1 m-m-t-3"> Access Wifi State </p>
            <p className="para1">
              {' '}
              This helps us to optimize your experience based on the Wifi&rsquo;s strength and
              signals, especially for optimizing video consultations.{' '}
            </p>
            <p className="para1 f-w-600 m-t-1 m-m-t-3"> Record Audio </p>
            <p className="para1"> To enable video consultations with doctors. </p>
            <p className="para1 f-w-600 m-t-1 m-m-t-3"> Bluetooth </p>
            <p className="para1">
              {' '}
              Bluetooth is used to redirect to bluetooth headset during video consultations.{' '}
            </p>
            <ol className="para2_ol_2 m-t-3 m-m-t-8" start={15}>
              <li className="para2_li f-w-700"> SEVERABILITY </li>
            </ol>
            <p className="para1 m-t-1 m-m-t-3">
              {' '}
              If any court or competent authority finds that any provision of this Privacy Notice
              (or part of any provision) is invalid, illegal or unenforceable, that provision or
              part-provision will, to the extent required, be deemed to be deleted, and the validity
              and enforceability of the other provisions of this Privacy Notice will not be
              affected.{' '}
            </p>
            <ol className="para2_ol_2 m-t-3 m-m-t-8" start={16}>
              <li className="para2_li f-w-700"> CHANGES TO THIS PRIVACY NOTICE </li>
            </ol>
            <p className="para1 m-t-1 m-m-t-3">
              {' '}
              Our business changes constantly and our Privacy Notice may also change . We may e-mail
              periodic reminders of our notices and conditions, unless you have instructed us not
              to, but you should check our website and mobile application frequently to see recent
              changes. The updated version will be effective as soon as it is accessible. Any
              changes will be immediately posted on our website and mobile application and you are
              deemed to have accepted the terms of the updated Privacy Notice on your first use of
              our website or mobile application or first purchase of the products and/or services
              following the alterations. We encourage you to review this Privacy Notice frequently
              to be informed of how we are protecting your information.{' '}
            </p>
            <ol className="para2_ol_2 m-t-3 m-m-t-8" start={17}>
              <li className="para2_li f-w-700"> HOW TO CONTACT US </li>
            </ol>
            <p className="para1 m-t-1 m-m-t-3">
              {' '}
              To request to access, review, update, or withdraw your consent for your personal
              information or to otherwise reach us, please&nbsp;submit a request by e-mailing us at{' '}
              <a
                href="mailto:spakshomeopathy@gmail.com"
                style={{
                  textDecoration: 'none',
                  color: '#ff6f61',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {'spakshomeopathy@gmail.com\n\n'}
              </a>
              . You may contact us for information on Service Providers, Partners and Spaks india
              business solution Pvt Ltd. with whom we may share your Data in compliance with this
              Privacy Notice and applicable law. We will respond to your request within 30
              days.{' '}
            </p>
          </div>
        </section>
        {/* /.blog-two */}
        <PublicFooter />
        {/* /.footer-one */}
        {/* /.page-wrapper */}
      </div>
      <PublicScripts />
    </>
  );
}
