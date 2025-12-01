class COPGestion {
  static ID = 'cop-gestion';
  
  static initialize() {
    console.log('COP Gestion | Initialisation du module');
    
    // Enregistrer les paramètres du module
    game.settings.register(this.ID, 'pokemonData', {
      name: 'Données Pokémon',
      scope: 'world',
      config: false,
      type: Object,
      default: {}
    });
    
    // Ajouter le bouton dans la barre d'outils
    this.addToolbarButton();
  }
  
  static addToolbarButton() {
    const button = $(`<button class="cop-gestion-btn"><i class="fas fa-paw"></i> Pokémons</button>`);
    button.click(() => this.openPokemonManager());
    $('#sidebar-tabs').append(button);
  }
  
  static openPokemonManager() {
    new PokemonManagerApp().render(true);
  }
  
  static async savePokemonData(data) {
    await game.settings.set(this.ID, 'pokemonData', data);
  }
  
  static getPokemonData() {
    return game.settings.get(this.ID, 'pokemonData');
  }
}

class PokemonManagerApp extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'pokemon-manager',
      title: 'Gestionnaire Pokémon',
      template: 'modules/cop-gestion/templates/pokemon-manager.hbs',
      width: 800,
      height: 600,
      resizable: true,
      tabs: [{navSelector: '.tabs', contentSelector: '.content', initial: 'pokemon-list'}]
    });
  }
  
  getData() {
    const pokemonData = COPGestion.getPokemonData();
    const actors = game.actors.filter(a => a.type === 'character');
    
    return {
      actors: actors,
      pokemonData: pokemonData,
      players: Object.keys(pokemonData)
    };
  }
  
  activateListeners(html) {
    super.activateListeners(html);
    
    html.find('.add-pokemon').click(this._onAddPokemon.bind(this));
    html.find('.delete-pokemon').click(this._onDeletePokemon.bind(this));
    html.find('.add-exp').click(this._onAddExp.bind(this));
    html.find('.pokemon-exp').change(this._onExpChange.bind(this));
  }
  
  async _onAddPokemon(event) {
    const playerId = $(event.currentTarget).data('player');
    const pokemonName = await this._promptPokemonName();
    
    if (pokemonName) {
      const pokemonData = COPGestion.getPokemonData();
      if (!pokemonData[playerId]) pokemonData[playerId] = [];
      
      pokemonData[playerId].push({
        id: foundry.utils.randomID(),
        name: pokemonName,
        level: 1,
        exp: 0,
        expToNext: 100
      });
      
      await COPGestion.savePokemonData(pokemonData);
      this.render();
    }
  }
  
  async _onDeletePokemon(event) {
    const playerId = $(event.currentTarget).data('player');
    const pokemonId = $(event.currentTarget).data('pokemon');
    
    const pokemonData = COPGestion.getPokemonData();
    pokemonData[playerId] = pokemonData[playerId].filter(p => p.id !== pokemonId);
    
    await COPGestion.savePokemonData(pokemonData);
    this.render();
  }
  
  async _onAddExp(event) {
    const playerId = $(event.currentTarget).data('player');
    const pokemonId = $(event.currentTarget).data('pokemon');
    const expGain = parseInt($(event.currentTarget).siblings('.exp-input').val()) || 0;
    
    if (expGain > 0) {
      const pokemonData = COPGestion.getPokemonData();
      const pokemon = pokemonData[playerId].find(p => p.id === pokemonId);
      
      pokemon.exp += expGain;
      this._checkLevelUp(pokemon);
      
      await COPGestion.savePokemonData(pokemonData);
      this.render();
    }
  }
  
  async _onExpChange(event) {
    const playerId = $(event.currentTarget).data('player');
    const pokemonId = $(event.currentTarget).data('pokemon');
    const newExp = parseInt($(event.currentTarget).val()) || 0;
    
    const pokemonData = COPGestion.getPokemonData();
    const pokemon = pokemonData[playerId].find(p => p.id === pokemonId);
    
    pokemon.exp = newExp;
    this._checkLevelUp(pokemon);
    
    await COPGestion.savePokemonData(pokemonData);
    this.render();
  }
  
  _checkLevelUp(pokemon) {
    while (pokemon.exp >= pokemon.expToNext) {
      pokemon.exp -= pokemon.expToNext;
      pokemon.level++;
      pokemon.expToNext = Math.floor(pokemon.expToNext * 1.2);
      
      ui.notifications.info(`${pokemon.name} monte au niveau ${pokemon.level} !`);
    }
  }
  
  async _promptPokemonName() {
    return new Promise((resolve) => {
      new Dialog({
        title: 'Nouveau Pokémon',
        content: '<p>Nom du Pokémon: <input type="text" id="pokemon-name" /></p>',
        buttons: {
          ok: {
            label: 'Ajouter',
            callback: (html) => resolve(html.find('#pokemon-name').val())
          },
          cancel: {
            label: 'Annuler',
            callback: () => resolve(null)
          }
        }
      }).render(true);
    });
  }
}

Hooks.once('init', () => {
  COPGestion.initialize();
});

Hooks.once('ready', () => {
  console.log('COP Gestion | Module prêt');
});