// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
/// @notice Non-custodial tournament attendance registry. No wagers or settlement.
contract RiverEvents {
    address public immutable organizer;
    struct Tournament { uint64 opens; uint64 closes; uint32 capacity; uint32 entrants; }
    mapping(uint256 => Tournament) public tournaments;
    mapping(uint256 => mapping(address => bool)) public joined;
    event Created(uint256 indexed id, uint64 opens, uint64 closes, uint32 capacity);
    event Joined(uint256 indexed id, address indexed player);
    constructor() { organizer = msg.sender; }
    function create(uint256 id, uint64 opens, uint64 closes, uint32 capacity) external {
        require(msg.sender == organizer, "Organizer only");
        require(tournaments[id].capacity == 0 && capacity > 0 && closes > opens && closes > block.timestamp, "Invalid event");
        tournaments[id] = Tournament(opens, closes, capacity, 0);
        emit Created(id, opens, closes, capacity);
    }
    function join(uint256 id) external {
        Tournament storage t = tournaments[id];
        require(t.capacity > 0 && block.timestamp >= t.opens && block.timestamp < t.closes, "Not open");
        require(!joined[id][msg.sender] && t.entrants < t.capacity, "Already joined or full");
        joined[id][msg.sender] = true;
        t.entrants++;
        emit Joined(id, msg.sender);
    }
}
