class SeatShuffler {
    constructor() {
        this.maxAttempts = 1000;
    }
    
    generate(students, layout, constraints) {
        let bestSeating = null;
        let bestScore = -Infinity;
        
        // Get latest history for history-based constraints
        const history = window.store.state.history || [];
        const latestHistory = history.length > 0 ? history[history.length - 1].seating : null;
        
        for (let i = 0; i < this.maxAttempts; i++) {
            const currentSeating = this.attemptAssign(students, layout, constraints, latestHistory);
            if (currentSeating) {
                const score = this.calculateScore(currentSeating, layout, constraints, students, latestHistory);
                if (score > bestScore) {
                    bestScore = score;
                    bestSeating = currentSeating;
                }
                if ((!constraints || constraints.length === 0) && i > 10) break;
            }
        }
        return bestSeating;
    }
    
    attemptAssign(students, layout, constraints, latestHistory) {
        const seating = new Map();
        const availableSeats = layout.seats.filter(s => s.type !== 'forbidden');
        const unassignedStudents = [...students];
        
        const fixedConstraints = (constraints || []).filter(c => c.type === 'fixed');
        for (const c of fixedConstraints) {
            const seat = availableSeats.find(s => s.row === (c.row - 1) && s.col === (c.col - 1));
            if (!seat) return null;
            seating.set(seat.id, c.studentId);
            const sIdx = unassignedStudents.findIndex(s => s.id == c.studentId);
            if (sIdx !== -1) unassignedStudents.splice(sIdx, 1);
        }
        
        this.shuffleArray(unassignedStudents);
        const remainingSeats = availableSeats.filter(s => !seating.has(s.id));
        this.shuffleArray(remainingSeats);
        
        for (const student of unassignedStudents) {
            let assigned = false;
            for (let i = 0; i < remainingSeats.length; i++) {
                const seat = remainingSeats[i];
                if (this.isValid(student, seat, seating, layout, constraints || [], latestHistory)) {
                    seating.set(seat.id, student.id);
                    remainingSeats.splice(i, 1);
                    assigned = true;
                    break;
                }
            }
            if (!assigned) return null;
        }
        
        return Array.from(seating.entries()).map(([seatId, studentId]) => ({
            seatId, studentId
        }));
    }
    
    isValid(student, seat, seating, layout, constraints, latestHistory) {
        if (seat.type === 'boys' && student.gender !== 'male') return false;
        if (seat.type === 'girls' && student.gender !== 'female') return false;
        
        // Check history-based constraints
        const hasNoSameSeat = constraints.some(c => c.isGlobal && c.type === 'no_same_seat');
        const hasNoSameNeighbor = constraints.some(c => c.isGlobal && c.type === 'no_same_neighbor');
        
        if (latestHistory && hasNoSameSeat) {
            // Check if this student was in this exact seat in the last seating
            const lastAssignment = latestHistory.find(a => a.studentId == student.id);
            if (lastAssignment && lastAssignment.seatId === seat.id) {
                return false;
            }
        }
        
        if (latestHistory && hasNoSameNeighbor) {
            // Check if this student would have the same left/right neighbors as last time
            const lastAssignment = latestHistory.find(a => a.studentId == student.id);
            if (lastAssignment) {
                const lastSeat = layout.seats.find(s => s.id === lastAssignment.seatId);
                if (lastSeat) {
                    // Get last time's left/right neighbors
                    const lastLeftNeighbor = this.getNeighborStudentId(lastSeat, -1, layout, latestHistory);
                    const lastRightNeighbor = this.getNeighborStudentId(lastSeat, 1, layout, latestHistory);
                    
                    // Get current proposed left/right neighbors
                    const currentLeftNeighbor = this.getNeighborStudentIdFromSeating(seat, -1, layout, seating);
                    const currentRightNeighbor = this.getNeighborStudentIdFromSeating(seat, 1, layout, seating);
                    
                    // If any neighbor is the same, reject
                    if (lastLeftNeighbor && (lastLeftNeighbor == currentLeftNeighbor || lastLeftNeighbor == currentRightNeighbor)) {
                        return false;
                    }
                    if (lastRightNeighbor && (lastRightNeighbor == currentLeftNeighbor || lastRightNeighbor == currentRightNeighbor)) {
                        return false;
                    }
                }
            }
        }
        
        // Individual constraints
        const myConstraints = constraints.filter(c => !c.isGlobal && (c.studentId == student.id || c.otherId == student.id));
        const maxRow = layout.rows;
        const maxCol = layout.cols;
        
        for (const c of myConstraints) {
            if (c.studentId != student.id) continue;
            
            if (c.type === 'row_front' && seat.row >= c.value) return false;
            if (c.type === 'row_back' && seat.row < maxRow - c.value) return false;
            if (c.type === 'col_left' && seat.col >= c.value) return false;
            if (c.type === 'col_right' && seat.col < maxCol - c.value) return false;
            
            if (c.type === 'min_dist' || c.type === 'max_dist') {
                const otherId = c.otherId;
                const otherSeatId = Array.from(seating.entries()).find(([sid, stid]) => stid == otherId)?.[0];
                if (otherSeatId) {
                    const otherSeat = layout.seats.find(s => s.id === otherSeatId);
                    const dist = Math.abs(seat.row - otherSeat.row) + Math.abs(seat.col - otherSeat.col);
                    if (c.type === 'min_dist' && dist < c.value) return false;
                    if (c.type === 'max_dist' && dist > c.value) return false;
                }
            }
            
            if (c.type === 'same_group' || c.type === 'diff_group') {
                const otherId = c.otherId;
                const otherSeatId = Array.from(seating.entries()).find(([sid, stid]) => stid == otherId)?.[0];
                if (otherSeatId) {
                    const otherSeat = layout.seats.find(s => s.id === otherSeatId);
                    const sameGroup = seat.groupId === otherSeat.groupId;
                    if (c.type === 'same_group' && !sameGroup) return false;
                    if (c.type === 'diff_group' && sameGroup) return false;
                }
            }
        }
        
        // Reverse constraints
        const reverseConstraints = constraints.filter(c => !c.isGlobal && c.otherId == student.id);
        for (const c of reverseConstraints) {
            if (c.type === 'min_dist' || c.type === 'max_dist') {
                const primarySeatId = Array.from(seating.entries()).find(([sid, stid]) => stid == c.studentId)?.[0];
                if (primarySeatId) {
                    const primarySeat = layout.seats.find(s => s.id === primarySeatId);
                    const dist = Math.abs(seat.row - primarySeat.row) + Math.abs(seat.col - primarySeat.col);
                    if (c.type === 'min_dist' && dist < c.value) return false;
                    if (c.type === 'max_dist' && dist > c.value) return false;
                }
            }
            if (c.type === 'same_group' || c.type === 'diff_group') {
                const primarySeatId = Array.from(seating.entries()).find(([sid, stid]) => stid == c.studentId)?.[0];
                if (primarySeatId) {
                    const primarySeat = layout.seats.find(s => s.id === primarySeatId);
                    const sameGroup = seat.groupId === primarySeat.groupId;
                    if (c.type === 'same_group' && !sameGroup) return false;
                    if (c.type === 'diff_group' && sameGroup) return false;
                }
            }
        }
        
        return true;
    }
    
    getNeighborStudentId(seat, colOffset, layout, seatingArray) {
        const neighborSeat = layout.seats.find(s => s.row === seat.row && s.col === seat.col + colOffset);
        if (!neighborSeat) return null;
        const assignment = seatingArray.find(a => a.seatId === neighborSeat.id);
        return assignment ? assignment.studentId : null;
    }
    
    getNeighborStudentIdFromSeating(seat, colOffset, layout, seatingMap) {
        const neighborSeat = layout.seats.find(s => s.row === seat.row && s.col === seat.col + colOffset);
        if (!neighborSeat) return null;
        return seatingMap.get(neighborSeat.id) || null;
    }
    
    calculateScore(seatingArray, layout, constraints, students, latestHistory) {
        let score = 0;
        
        // Badge-based scoring
        const badgeConstraints = (constraints || []).filter(c => c.isGlobal && (c.type === 'badge_together' || c.type === 'badge_apart'));
        
        for (const bc of badgeConstraints) {
            const badgedStudents = students.filter(s => (s.badges || []).includes(bc.badge));
            if (badgedStudents.length < 2) continue;
            
            let totalDist = 0;
            let pairs = 0;
            
            for (let i = 0; i < badgedStudents.length; i++) {
                for (let j = i + 1; j < badgedStudents.length; j++) {
                    const seat1 = seatingArray.find(a => a.studentId == badgedStudents[i].id);
                    const seat2 = seatingArray.find(a => a.studentId == badgedStudents[j].id);
                    if (seat1 && seat2) {
                        const s1 = layout.seats.find(s => s.id === seat1.seatId);
                        const s2 = layout.seats.find(s => s.id === seat2.seatId);
                        if (s1 && s2) {
                            const dist = Math.abs(s1.row - s2.row) + Math.abs(s1.col - s2.col);
                            totalDist += dist;
                            pairs++;
                        }
                    }
                }
            }
            
            if (pairs > 0) {
                const avgDist = totalDist / pairs;
                if (bc.type === 'badge_together') {
                    score -= avgDist * 10;
                } else if (bc.type === 'badge_apart') {
                    score += avgDist * 10;
                }
            }
        }
        
        return score;
    }
    
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}
window.SeatShuffler = SeatShuffler;
