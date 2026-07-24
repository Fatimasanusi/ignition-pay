import { Test, TestingModule } from '@nestjs/testing';
import { AddressesController } from './addresses.controller';
import { AddressesService } from './addresses.service';

describe('AddressesController', () => {
  let controller: AddressesController;
  let service: jest.Mocked<
    Pick<
      AddressesService,
      | 'create'
      | 'findAll'
      | 'findOne'
      | 'findByWallet'
      | 'update'
      | 'remove'
      | 'generate'
      | 'listByWallet'
      | 'generateMemo'
      | 'validateMemo'
      | 'resolveDeposit'
    >
  >;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByWallet: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      generate: jest.fn(),
      listByWallet: jest.fn(),
      generateMemo: jest.fn(),
      validateMemo: jest.fn(),
      resolveDeposit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AddressesController],
      providers: [{ provide: AddressesService, useValue: service }],
    }).compile();

    controller = module.get<AddressesController>(AddressesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create() should call addressesService.create', async () => {
    const dto = {
      walletId: 'w-123',
      address: 'G123',
      network: 'STELLAR' as any,
      label: 'test',
    };
    service.create.mockResolvedValue({ id: 'addr-123', ...dto } as any);
    const res = await controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
    expect(res).toEqual({ id: 'addr-123', ...dto });
  });

  it('findAll() should call addressesService.findAll', async () => {
    service.findAll.mockResolvedValue([{ id: 'addr-123' }] as any);
    const res = await controller.findAll();
    expect(service.findAll).toHaveBeenCalled();
    expect(res).toEqual([{ id: 'addr-123' }]);
  });

  it('findOne() should call addressesService.findOne', async () => {
    service.findOne.mockResolvedValue({ id: 'addr-123' } as any);
    const res = await controller.findOne('addr-123');
    expect(service.findOne).toHaveBeenCalledWith('addr-123');
    expect(res).toEqual({ id: 'addr-123' });
  });

  it('findByWallet() should call addressesService.findByWallet', async () => {
    service.findByWallet.mockResolvedValue([{ id: 'addr-123' }] as any);
    const res = await controller.findByWallet('w-123');
    expect(service.findByWallet).toHaveBeenCalledWith('w-123');
    expect(res).toEqual([{ id: 'addr-123' }]);
  });

  it('update() should call addressesService.update', async () => {
    const dto = { label: 'new-label' };
    service.update.mockResolvedValue({
      id: 'addr-123',
      label: 'new-label',
    } as any);
    const res = await controller.update('addr-123', dto);
    expect(service.update).toHaveBeenCalledWith('addr-123', dto);
    expect(res).toEqual({ id: 'addr-123', label: 'new-label' });
  });

  it('remove() should call addressesService.remove', async () => {
    service.remove.mockResolvedValue(undefined);
    await controller.remove('addr-123');
    expect(service.remove).toHaveBeenCalledWith('addr-123');
  });

  it('generate() should call addressesService.generate', async () => {
    const req = { user: { sub: 'user-123' } };
    const dto = { walletId: 'w-123' };
    service.generate.mockResolvedValue({ address: 'GNEW' } as any);
    const res = await controller.generate(req, dto);
    expect(service.generate).toHaveBeenCalledWith('user-123', dto);
    expect(res).toEqual({ address: 'GNEW' });
  });

  it('listByWallet() should call addressesService.listByWallet', async () => {
    const req = { user: { sub: 'user-123' } };
    service.listByWallet.mockResolvedValue([{ id: 'addr-123' }] as any);
    const res = await controller.listByWallet(req, 'w-123');
    expect(service.listByWallet).toHaveBeenCalledWith('user-123', 'w-123');
    expect(res).toEqual([{ id: 'addr-123' }]);
  });

  it('generateMemo() should call addressesService.generateMemo', async () => {
    const req = { user: { sub: 'user-123' } };
    const dto = { walletId: 'w-123', memoType: 'id' as any };
    service.generateMemo.mockResolvedValue({ memoValue: '123' } as any);
    const res = await controller.generateMemo(req, dto);
    expect(service.generateMemo).toHaveBeenCalledWith('user-123', dto);
    expect(res).toEqual({ memoValue: '123' });
  });

  it('validateMemo() should call addressesService.validateMemo', async () => {
    const dto = { memoType: 'text', memoValue: 'note' };
    service.validateMemo.mockResolvedValue({ valid: true } as any);
    const res = await controller.validateMemo(dto);
    expect(service.validateMemo).toHaveBeenCalledWith(dto);
    expect(res).toEqual({ valid: true });
  });

  it('resolveDeposit() should call addressesService.resolveDeposit', async () => {
    const dto = { destination: 'G123', memoType: 'id', memoValue: '123' };
    service.resolveDeposit.mockResolvedValue({ routed: true } as any);
    const res = await controller.resolveDeposit(dto);
    expect(service.resolveDeposit).toHaveBeenCalledWith(dto);
    expect(res).toEqual({ routed: true });
  });
});
