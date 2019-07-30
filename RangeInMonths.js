const moment = require('moment')

module.exports = class RangeInMonths {
    constructor(start, end) {
        this.start = moment(start);
        this.last = moment(end);
        this.monthCounter =  0;
        }
    [Symbol.iterator]() {
        return {
            next: () => {
                // If the end of 
                var current_start = this.start.clone().add(this.monthCounter, 'months')
                var current_end = this.start.clone().add(this.monthCounter + 1, 'months')
                this.monthCounter = this.monthCounter + 1;
                if(current_end <= this.last)
                    return {
                        value: {start: current_start, end: current_end}, 
                        done: false
                    }
                else if(current_start <= this.last)
                    return {
                        value: {start: current_start, end: this.last}, 
                        done: false
                    }
                else return {
                    done: true
                }
            }
        }
    }
}