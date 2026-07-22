use aether_sdk::local::{MemoryAuditSink, MemoryLiveState};

#[test]
fn ems_consumes_local_runtime_adapters_through_the_single_sdk_facade() {
    let _live_state = MemoryLiveState::new();
    let _audit = MemoryAuditSink::new();
}
