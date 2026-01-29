import { Randomizer } from "./randomization";
import { PartyGenerator } from "./party-generator";

export class DiningTime {
  private readonly lowerBound: number;
  private readonly upperBound: number;

  constructor(lowerBound: number, upperBound: number) {
    this.lowerBound = lowerBound;
    this.upperBound = upperBound;
  }

  public getLowerBound(): number {
    return this.lowerBound;
  }

  public getUpperBound(): number {
    return this.upperBound;
  }

  public interpolate(randomizer: Randomizer): number {
    return this.lowerBound + randomizer.float() * (this.upperBound - this.lowerBound);
  }
}

export class Table {
  private id: number;
  private capacity: number;
  private patrons: Person[];
  
  constructor(id: number, capacity: number, patrons: Person[] = []) {
    this.id = id;
    this.capacity = capacity;
    this.patrons = patrons;
  }

  public getId(): number {
    return this.id;
  }

  public getCapacity(): number {
    return this.capacity;
  }

  public getPatrons(): Person[] {
    return this.patrons;
  }

  public addPatron(person: Person): boolean {
    if (this.patrons.length < this.capacity) {
      this.patrons.push(person);
      return true;
    }
    return false;
  }
  
  public emptyTable(): void {
    this.patrons.forEach(patron => patron.leaveTable(this));
    this.patrons = [];
  }
}

export class Party {
  private members: Person[];

  constructor(members: Person[]) {
    this.members = members;
  }

  public getMembers(): Person[] {
    return this.members;
  }

  public getSize(): number {
    return this.members.length;
  }
}

export class Restaurant {
  private tables: Table[];
  private waitingQueue: Party[];
  private currentTime: number;

  constructor(tables: Table[]) {
    this.tables = tables;
    this.waitingQueue = [];
    this.currentTime = 0;
  }

  public addToWaitingQueue(party: Party): void {
    this.waitingQueue.push(party);
  }

  public getWaitingQueue(): Party[] {
    return this.waitingQueue;
  }

  public getWaitingPatronCount(): number {
    return this.waitingQueue.reduce((sum, party) => sum + party.getSize(), 0);
  }

  public findAvailableTable(partySize: number): Table | undefined {
    return this.tables.find(table => 
      table.getPatrons().length === 0 && table.getCapacity() >= partySize
    );
  }

  public seatParty(party: Party): boolean {
    const table = this.findAvailableTable(party.getSize());
    if (!table) {
      return false;
    }
    for (const person of party.getMembers()) {
      person.sitDown(table);
    }
    return true;
  }

  public simulateStep(timeStep: number): void {
    this.currentTime += timeStep;

    // Check each table to see if patrons are done dining
    for (const table of this.tables) {
      const patrons = table.getPatrons();
      if (patrons.length > 0) {
        // Check if the longest dining time has elapsed
        const maxDiningTime = Math.max(...patrons.map(p => p.getActualDiningTime()));
        if (this.currentTime >= maxDiningTime) {
          table.emptyTable();
        }
      }
    }

    // Try to seat waiting parties
    while (this.waitingQueue.length > 0) {
      const nextParty = this.waitingQueue[0];
      const table = this.findAvailableTable(nextParty.getSize());
      if (table) {
        this.waitingQueue.shift();
        this.seatParty(nextParty);
      } else {
        break; // No available tables for this party size
      }
    }
  }

  public runSimulation(duration: number, timeStep: number): void {
    while (this.currentTime < duration) {
      this.simulateStep(timeStep);
    }
  }

  public getOccupiedTableCount(): number {
    return this.tables.filter(table => table.getPatrons().length > 0).length;
  }

  public getTotalSeatedPatrons(): number {
    return this.tables.reduce((sum, table) => sum + table.getPatrons().length, 0);
  }

}

export class Person {
  private id: number;
  private name: string;
  private age: number;
  private diningTime: DiningTime;
  private actualDiningTime: number;
  private sitting_at_table: Table | undefined;

  constructor(id: number, name: string, age: number, diningTime: DiningTime, randomizer: Randomizer) {
    this.id = id;
    this.name = name;
    this.age = age;
    this.diningTime = diningTime;
    this.actualDiningTime = diningTime.interpolate(randomizer);
  }

  public getId(): number {
    return this.id;
  }

  public getName(): string {
    return this.name;
  }

  public getAge(): number {
    return this.age;
  }

  public getDiningTime(): DiningTime {
    return this.diningTime;
  }

  public getActualDiningTime(): number {
    return this.actualDiningTime;
  }
  
  public sitDown(table: Table) : void {
    if (this.sitting_at_table) { // TODO: should be ok if it's the same table?
      throw new Error(`${this.name} is already sitting!`);
    }
    const was_seated = table.addPatron(this);
    if (!was_seated) {
      throw new Error(`Table ${table.getId()} is full!`);
    }
    this.sitting_at_table = table;
  }

  public leaveTable(table: Table) : void {
    if (this.sitting_at_table === table) {
      this.sitting_at_table = undefined;
    }
    else {
      // they weren't at that table
    }
  }
}

function main(): void {
  // Create a randomizer for the simulation
  const randomizer = Randomizer.create_from_seed("restaurant-sim");

  // Create tables with different capacities
  const tables = [
    new Table(1, 2),  // Table for 2
    new Table(2, 2),  // Table for 2
    new Table(3, 4),  // Table for 4
    new Table(4, 4),  // Table for 4
    new Table(5, 6),  // Table for 6
  ];

  // Create the restaurant
  const restaurant = new Restaurant(tables);

  console.log("=== Restaurant Simulation ===");
  console.log(`Tables: ${tables.length}`);
  console.log(`Total capacity: ${tables.reduce((sum, t) => sum + t.getCapacity(), 0)}`);
  console.log("");

  // Simulation parameters
  const duration = 240; // 4 hours until closing
  const timeStep = 5;

  const partyGenerator = new PartyGenerator(randomizer, {
    arrivalRate: 0.4,
    minPartySize: 1,
    maxPartySize: 6,
    minDiningTime: 30,
    maxDiningTime: 90
  });

  let partyCount = 0;
  let totalPatronsServed = 0;

  for (let time = 0; time <= duration; time += timeStep) {
    // Generate new parties randomly throughout the simulation
    const newParty = partyGenerator.generateParty();
    if (newParty) {
      restaurant.addToWaitingQueue(newParty);
      partyCount++;
    }

    const seatedBefore = restaurant.getTotalSeatedPatrons();
    restaurant.simulateStep(timeStep);
    const seatedAfter = restaurant.getTotalSeatedPatrons();
    
    // Track patrons who have left (were seated before but table was emptied)
    if (seatedAfter < seatedBefore) {
      totalPatronsServed += (seatedBefore - seatedAfter);
    }

    console.log(`Time: ${time} min | Occupied tables: ${restaurant.getOccupiedTableCount()}/${tables.length} | Seated: ${restaurant.getTotalSeatedPatrons()} | Waiting: ${restaurant.getWaitingPatronCount()} (${restaurant.getWaitingQueue().length} parties) | Total arrived: ${partyGenerator.getNextPatronId() - 1}`);
  }

  console.log("");
  console.log("=== Simulation Complete (Closing Time) ===");
  console.log(`Total patrons arrived: ${partyGenerator.getNextPatronId() - 1}`);
  console.log(`Patrons served and left: ${totalPatronsServed}`);
  console.log(`Still seated at closing: ${restaurant.getTotalSeatedPatrons()}`);
  console.log(`Turned away (still waiting): ${restaurant.getWaitingQueue().length}`);
}

main();
