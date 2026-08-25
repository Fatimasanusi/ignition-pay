#![no_std]
use soroban_sdk::{contract, contractimpl, Address, Env, Symbol, Vec, Map};

const MAX_CALLS_PER_LEDGER: u32 = 5;

#[contract]
pub struct IgnitionPayContract;

#[contractimpl]
impl IgnitionPayContract {
    pub fn initialize(env: Env, admin: Address) {
        env.storage().instance().set(&"admin", &admin);
        env.storage().instance().set(&"authorizations", &Vec::<Address>::new(&env));
        env.storage().instance().set(&"rate_limit", &Map::<Address, (u32, u32)>::new(&env));
        env.storage().instance().set(&"kyc_status", &Map::<Address, bool>::new(&env));
    }

    fn check_rate_limit(&self, env: &Env, user: &Address) {
        let mut rate_limit: Map<Address, (u32, u32)> = env.storage().instance().get(&"rate_limit").unwrap_or_else(|| Map::new(env));
        let current_ledger = env.ledger().sequence();

        let (last_ledger, call_count) = rate_limit.get(user.clone()).unwrap_or((0, 0));

        if last_ledger == current_ledger {
            if call_count >= MAX_CALLS_PER_LEDGER {
                panic!("Rate limit exceeded");
            }
            rate_limit.set(user.clone(), (current_ledger, call_count + 1));
        } else {
            rate_limit.set(user.clone(), (current_ledger, 1));
        }

        env.storage().instance().set(&"rate_limit", &rate_limit);
    }

    pub fn set_kyc_status(&self, env: &Env, user: &Address, kyc_completed: bool) {
        let admin = env.storage().instance().get(&"admin").unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();

        let mut kyc_status: Map<Address, bool> = env.storage().instance().get(&"kyc_status").unwrap_or_else(|| Map::new(env));
        kyc_status.set(user.clone(), kyc_completed);
        env.storage().instance().set(&"kyc_status", &kyc_status);
    }

    pub fn authorize(env: Env, user: Address) {
        let admin = env.storage().instance().get(&"admin").unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();

        self.check_rate_limit(&env, &admin);

        let kyc_status: Map<Address, bool> = env.storage().instance().get(&"kyc_status").unwrap_or_else(|| Map::new(&env));
        if !kyc_status.get(user.clone()).unwrap_or(false) {
            panic!("KYC not completed");
        }

        let mut authorizations: Vec<Address> = env.storage().instance().get(&"authorizations").unwrap_or_else(|| Vec::new(&env));
        authorizations.push_back(user);
        env.storage().instance().set(&"authorizations", &authorizations);
    }

    pub fn revoke(env: Env, user: Address) {
        let admin = env.storage().instance().get(&"admin").unwrap_or_else(|| panic!("Admin not set"));
        admin.require_auth();

        self.check_rate_limit(&env, &admin);

        let mut authorizations: Vec<Address> = env.storage().instance().get(&"authorizations").unwrap_or_else(|| Vec::new(&env));
        if let Some(index) = authorizations.iter().position(|a| a == user) {
            authorizations.remove(index as u32);
        }
        env.storage().instance().set(&"authorizations", &authorizations);
    }

    pub fn is_authorized(env: Env, user: Address) -> bool {
        let authorizations: Vec<Address> = env.storage().instance().get(&"authorizations").unwrap_or_else(|| Vec::new(&env));
        authorizations.contains(&user)
    }
}