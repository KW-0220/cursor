/**
 * Local smoke: MYSQL_* must point at a live MySQL/MariaDB.
 *   npx tsx scripts/mysql-smoke.ts
 */
process.env.MYSQL_HOST ??= "127.0.0.1";
process.env.MYSQL_PORT ??= "3306";
process.env.MYSQL_USER ??= "sme";
process.env.MYSQL_PASSWORD ??= "sme_dev_pass";
process.env.MYSQL_DATABASE ??= "sme_loanflow";

async function main() {
  const { pingMysql, resetMysqlForTests } = await import("../src/lib/db/mysql");
  const {
    registerUser,
    findUserByEmail,
    getAuthStorageMode,
    ensureAdminUser,
  } = await import("../src/lib/auth");
  const {
    upsertCustomer,
    listCustomers,
    getCustomerStorageMode,
  } = await import("../src/lib/customer-registry");

  resetMysqlForTests();
  console.log("auth", getAuthStorageMode(), "customers", getCustomerStorageMode());
  console.log("ping", await pingMysql());

  const email = `mysql-test-${Date.now()}@example.com`;
  const u = await registerUser({
    email,
    password: "password123",
    phone: "+85291234567",
    idNumber: "A123456(7)",
    nameZh: "測試",
  });
  console.log("registered", u.id);
  const found = await findUserByEmail(email);
  if (!found) throw new Error("user not found after register");

  const admin = await ensureAdminUser();
  console.log("admin", admin.email, admin.role);

  const c = await upsertCustomer({
    applicantNameZh: "測試甲",
    applicantNameEn: "Test A",
    idNumber: "Z999999(9)",
    phone: "+85290001111",
    email: `cust${Date.now()}@ex.com`,
    title: "董事",
    relation: "董事",
    companyNameZh: "測試公司",
    companyNameEn: "Test Co",
    brNumber: `BR${Date.now()}`,
    crNumber: "CR1",
    foundedAt: "2020-01-01",
    companyType: "有限公司",
    industry: "科技",
    address: "HK",
    employees: 3,
    contactPerson: "測試甲",
    source: "test",
  });
  console.log("customer", c.id);
  const list = await listCustomers();
  console.log("customers count", list.length);
  console.log("OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
